import { supabase } from './supabase';

/**
 * Generate or retrieve a visitor ID for analytics
 */
function getVisitorId(): string {
	const STORAGE_KEY = 'wedding-mass-visitor-id';

	// Try to get existing ID from localStorage
	let visitorId = localStorage.getItem(STORAGE_KEY);

	if (!visitorId) {
		// Generate new UUID-like ID
		visitorId = crypto.randomUUID();
		localStorage.setItem(STORAGE_KEY, visitorId);
	}

	return visitorId;
}

/**
 * Track a mass visit
 */
export async function trackMassVisit(massId: string): Promise<{ error: Error | null }> {
	try {
		const visitorId = getVisitorId();
		const userAgent = navigator.userAgent;

		// Call the database function to track visit
		const { error } = await supabase.rpc('track_mass_visit', {
			p_mass_id: massId,
			p_visitor_id: visitorId,
			p_user_agent: userAgent
		});

		if (error) {
			console.error('[Analytics] Failed to track visit:', error);
			return { error };
		}

		return { error: null };
	} catch (err) {
		const error = err instanceof Error ? err : new Error('Unknown error');
		console.error('[Analytics] Exception tracking visit:', error);
		return { error };
	}
}

/**
 * Get analytics for a specific mass (admin only)
 */
export async function getMassAnalytics(massId: string) {
	try {
		const { data, error } = await supabase
			.from('mass_analytics')
			.select('*')
			.eq('mass_id', massId)
			.order('first_visit_at', { ascending: false });

		if (error) {
			console.error('[Analytics] Failed to fetch analytics:', error);
			return { data: null, error };
		}

		return { data, error: null };
	} catch (err) {
		const error = err instanceof Error ? err : new Error('Unknown error');
		console.error('[Analytics] Exception fetching analytics:', error);
		return { data: null, error };
	}
}

/**
 * Get analytics summary for a mass
 */
export async function getMassAnalyticsSummary(massId: string) {
	try {
		const { data, error } = await getMassAnalytics(massId);

		if (error || !data) {
			return {
				totalVisitors: 0,
				totalVisits: 0,
				uniqueVisitors: 0,
				error
			};
		}

		const totalVisitors = data.length;
		const totalVisits = data.reduce((sum, record) => sum + (record.visit_count || 0), 0);
		const uniqueVisitors = new Set(data.map(record => record.visitor_id)).size;

		return {
			totalVisitors,
			totalVisits,
			uniqueVisitors,
			firstVisit: data[0]?.first_visit_at,
			lastVisit: data[data.length - 1]?.last_visit_at,
			error: null
		};
	} catch (err) {
		const error = err instanceof Error ? err : new Error('Unknown error');
		console.error('[Analytics] Exception calculating summary:', error);
		return {
			totalVisitors: 0,
			totalVisits: 0,
			uniqueVisitors: 0,
			error
		};
	}
}

/**
 * Check if current user is super admin (fixed account)
 * Only the specific admin account can view analytics
 */
export async function isSuperAdmin(): Promise<boolean> {
	try {
		const { data: { user } } = await supabase.auth.getUser();

		if (!user) {
			return false;
		}

		// Check if user email matches the fixed admin account
		// TODO: Replace with actual admin email from environment variable
		const ADMIN_EMAIL = 'admin@woory.day'; // Replace with actual admin email

		return user.email === ADMIN_EMAIL;
	} catch (error) {
		console.error('[Analytics] Failed to check admin status:', error);
		return false;
	}
}
