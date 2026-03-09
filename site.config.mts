import type { AstroInstance } from 'astro';
import { Instagram } from 'lucide-astro';

export interface SocialLink {
	name: string;
	url: string;
	icon: AstroInstance;
}

export default {
	title: 'MGB',
	favicon: 'favicon.ico',
	owner: 'Miles Berry',
	profileImage: 'profile.jpg',
	socialLinks: [
		{
			name: 'Instagram',
			url: 'https://www.instagram.com/mgberry',
			icon: Instagram,
		} as SocialLink,
	],
};
