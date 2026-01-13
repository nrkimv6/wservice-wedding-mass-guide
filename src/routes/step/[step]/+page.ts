import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const stepId = parseInt(params.step);

	if (isNaN(stepId) || stepId < 1) {
		throw redirect(302, '/');
	}

	// Redirect to home with step parameter
	// The home page will handle setting the step
	throw redirect(302, `/?step=${stepId}`);
};
