<script lang="ts">
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
</script>

<article class="mx-auto prose max-w-3xl px-4 py-16 sm:px-6">
	<h1>{m.footer_datenschutz()}</h1>
	<p>{m.legal_privacy_intro()}</p>

	<h2>{m.legal_privacy_controller_heading()}</h2>
	<p>
		{m.legal_operator()}<br />
		{m.legal_represented_label()}: {m.legal_represented_name()}<br />
		{m.legal_street()}<br />
		{m.legal_postal_city()}<br />
		{m.legal_country()}<br />
		{m.legal_impressum_email_label()}:
		<a href="mailto:{m.legal_email()}">{m.legal_email()}</a>
	</p>
	<p>{m.legal_privacy_controller_text()}</p>
	<p>
		<a href={resolve("/impressum")}>{m.legal_privacy_imprint_link()}</a>
	</p>

	<h2>{m.legal_privacy_hosting_heading()}</h2>
	<p>{m.legal_privacy_hosting_text()}</p>

	<h2>{m.legal_privacy_account_heading()}</h2>
	<p>{m.legal_privacy_account_text()}</p>

	<h2>{m.legal_privacy_cookie_heading()}</h2>
	<p>{m.legal_privacy_cookie_text()}</p>

	<h2>{m.legal_privacy_contact_heading()}</h2>
	<p>{m.legal_privacy_contact_text()}</p>

	<h2>{m.legal_privacy_mail_heading()}</h2>
	<p>{m.legal_privacy_mail_text()}</p>

	<h2>{m.legal_privacy_shelter_heading()}</h2>
	<p>{m.legal_privacy_shelter_text()}</p>

	<h2>{m.legal_privacy_analytics_heading()}</h2>
	<p>{m.legal_privacy_analytics_text()}</p>

	<h2>{m.legal_privacy_rights_heading()}</h2>
	<p>{m.legal_privacy_rights_text()}</p>
</article>
