import { supabase } from '$lib/services/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SyncState {
	connected: boolean;
	syncing: boolean;
	connectedUsers: number;
	error: string | null;
}

class RealtimeSyncStore {
	private channel: RealtimeChannel | null = $state(null);
	private massId: string | null = $state(null);

	state = $state<SyncState>({
		connected: false,
		syncing: false,
		connectedUsers: 0,
		error: null
	});

	// Connect to a mass's realtime channel
	connect(massId: string) {
		// Disconnect from previous channel if exists
		this.disconnect();

		this.massId = massId;
		const channelName = `mass:${massId}`;

		// Create channel with presence tracking
		this.channel = supabase.channel(channelName, {
			config: {
				presence: {
					key: crypto.randomUUID() // Unique key per client
				}
			}
		});

		// Track presence (connected users)
		this.channel
			.on('presence', { event: 'sync' }, () => {
				const state = this.channel?.presenceState();
				if (state) {
					this.state.connectedUsers = Object.keys(state).length;
				}
			})
			.on('presence', { event: 'join' }, ({ key, newPresences }) => {
				console.log('[Realtime] User joined:', key, newPresences);
			})
			.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
				console.log('[Realtime] User left:', key, leftPresences);
			})
			.subscribe(async (status) => {
				console.log('[Realtime] Subscription status:', status);

				if (status === 'SUBSCRIBED') {
					this.state.connected = true;
					this.state.error = null;

					// Track this client's presence
					await this.channel?.track({
						online_at: new Date().toISOString()
					});
				} else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
					this.state.connected = false;
					this.state.error = 'Connection failed';
				} else if (status === 'CLOSED') {
					this.state.connected = false;
				}
			});
	}

	// Disconnect from channel
	disconnect() {
		if (this.channel) {
			console.log('[Realtime] Disconnecting...');
			supabase.removeChannel(this.channel);
			this.channel = null;
			this.state.connected = false;
			this.state.syncing = false;
			this.state.connectedUsers = 0;
		}
	}

	// Send step change broadcast
	broadcastStep(step: number) {
		if (!this.channel) {
			console.warn('[Realtime] No channel connected');
			return;
		}

		this.channel.send({
			type: 'broadcast',
			event: 'step_change',
			payload: { step }
		});
	}

	// Listen for step changes
	onStepChange(callback: (step: number) => void) {
		if (!this.channel) {
			console.warn('[Realtime] No channel connected');
			return () => {};
		}

		this.channel.on('broadcast', { event: 'step_change' }, ({ payload }) => {
			console.log('[Realtime] Received step change:', payload.step);
			callback(payload.step);
		});

		// Return unsubscribe function
		return () => {
			this.channel?.unsubscribe();
		};
	}

	// Enable/disable sync mode
	setSyncEnabled(enabled: boolean) {
		this.state.syncing = enabled;
	}
}

export const realtimeSyncStore = new RealtimeSyncStore();
