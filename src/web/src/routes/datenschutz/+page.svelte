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
		<a class="inline-flex min-h-11 items-center" href="mailto:{m.legal_email()}"
			>{m.legal_email()}</a
		>
	</p>
	<p>{m.legal_privacy_controller_text()}</p>
	<p>
		<a class="inline-flex min-h-11 items-center" href={resolve("/impressum")}
			>{m.legal_privacy_imprint_link()}</a
		>
	</p>

	<h2>{m.legal_privacy_hosting_heading()}</h2>
	<p>{m.legal_privacy_hosting_text()}</p>

	<h2>{m.legal_privacy_recipients_heading()}</h2>
	<p>{m.legal_privacy_recipients_text()}</p>

	<h2>{m.legal_privacy_transfers_heading()}</h2>
	<p>{m.legal_privacy_transfers_text()}</p>

	<h2>{m.legal_privacy_logs_heading()}</h2>
	<p>{m.legal_privacy_logs_text()}</p>

	<h2>{m.legal_privacy_security_heading()}</h2>
	<p>{m.legal_privacy_security_text()}</p>

	<h2>{m.legal_privacy_turnstile_heading()}</h2>
	<p>{m.legal_privacy_turnstile_text()}</p>

	<h2>{m.legal_privacy_cookie_heading()}</h2>
	<p>{m.legal_privacy_cookies_intro()}</p>
	<ul>
		<li>{m.legal_privacy_cookie_session()}</li>
		<li>{m.legal_privacy_cookie_last_home()}</li>
		<li>{m.legal_privacy_cookie_shelter()}</li>
		<li>{m.legal_privacy_cookie_chrome()}</li>
		<li>{m.legal_privacy_cookie_turnstile()}</li>
	</ul>

	<h2>{m.legal_privacy_account_heading()}</h2>
	<p>{m.legal_privacy_account_text()}</p>
	<p>{m.legal_privacy_account_mfa_text()}</p>

	<h2>{m.legal_privacy_age_heading()}</h2>
	<p>{m.legal_privacy_age_text()}</p>

	<h2>{m.legal_privacy_location_heading()}</h2>
	<p>{m.legal_privacy_location_text()}</p>

	<h2>{m.legal_privacy_chat_heading()}</h2>
	<p>{m.legal_privacy_chat_text()}</p>

	<h2>{m.legal_privacy_matching_heading()}</h2>
	<p>{m.legal_privacy_matching_text()}</p>

	<h2>{m.legal_privacy_reviews_heading()}</h2>
	<p>{m.legal_privacy_reviews_text()}</p>

	<h2>{m.legal_privacy_shelter_heading()}</h2>
	<p>{m.legal_privacy_shelter_text()}</p>

	<h2>{m.legal_privacy_invites_heading()}</h2>
	<p>{m.legal_privacy_invites_text()}</p>

	<h2>{m.legal_privacy_contact_heading()}</h2>
	<p>{m.legal_privacy_contact_text()}</p>

	<h2>{m.legal_privacy_mail_heading()}</h2>
	<p>{m.legal_privacy_mail_text()}</p>

	<h2>{m.legal_privacy_external_heading()}</h2>
	<p>{m.legal_privacy_external_text()}</p>

	<h2>{m.legal_privacy_analytics_heading()}</h2>
	<p>{m.legal_privacy_analytics_text()}</p>

	<h2>{m.legal_privacy_deletion_heading()}</h2>
	<p>{m.legal_privacy_deletion_text()}</p>

	<h2>{m.legal_privacy_rights_heading()}</h2>
	<p>{m.legal_privacy_rights_text()}</p>

	<h2>{m.legal_privacy_changes_heading()}</h2>
	<p>{m.legal_privacy_changes_text()}</p>
</article>
