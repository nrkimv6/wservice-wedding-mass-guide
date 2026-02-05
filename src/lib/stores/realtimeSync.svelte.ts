import { supabase } from '$lib/services/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { debugLog } from '$lib/utils/debug';

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
				debugLog('Realtime', 'User joined:', key, newPresences);
			})
			.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
				debugLog('Realtime', 'User left:', key, leftPresences);
			})
			.subscribe(async (status) => {
				debugLog('Realtime', 'Subscription status:', status);

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
			debugLog('Realtime', 'Disconnecting...');
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
			debugLog('Realtime', 'Received step change:', payload.step);
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
