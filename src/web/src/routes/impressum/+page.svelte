<script lang="ts">
	import { m } from "$lib/paraglide/messages";
</script>

<article class="mx-auto prose max-w-3xl px-4 py-16 sm:px-6">
	<h1>{m.footer_impressum()}</h1>

	<h2>{m.legal_impressum_heading_provider()}</h2>
	<p>
		{m.legal_operator()}<br />
		{m.legal_street()}<br />
		{m.legal_postal_city()}<br />
		{m.legal_country()}<br />
		{m.legal_represented_label()}: {m.legal_represented_name()}<br />
		{m.legal_phone_label()}:
		<a class="inline-flex min-h-11 items-center" href="tel:+491759521503">{m.legal_phone()}</a><br
		/>
		{m.legal_impressum_email_label()}:
		<a class="inline-flex min-h-11 items-center" href="mailto:{m.legal_email()}"
			>{m.legal_email()}</a
		><br />
		{m.legal_vat_label()}: {m.legal_vat()}
	</p>

	<h2>{m.legal_content_responsible_label()}</h2>
	<p>{m.legal_content_responsible()}</p>

	<h2>{m.legal_impressum_dispute_heading()}</h2>
	<p>{m.legal_impressum_dispute_text()}</p>

	<h2>{m.legal_impressum_liability_content_heading()}</h2>
	<p>{m.legal_impressum_liability_content_text()}</p>

	<h2>{m.legal_impressum_liability_links_heading()}</h2>
	<p>{m.legal_impressum_liability_links_text()}</p>

	<h2>{m.legal_impressum_ugc_heading()}</h2>
	<p>{m.legal_impressum_ugc_text()}</p>

	<h2>{m.legal_impressum_copyright_heading()}</h2>
	<p>{m.legal_impressum_copyright_text()}</p>
</article>
