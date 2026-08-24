import type { MailOptions } from "./mail";

export const BRAND_NAME = "Adoptier Lieber";
export const BRAND_URL = "https://adoptierlieber.de";
const BRAND_DOMAIN = "adoptierlieber.de";
const STAGING_URL = "https://staging.adoptierlieber.de";

/** Public web origin for links in mail. Local: PUBLIC_SITE_URL. Staging: ENVIRONMENT=staging. */
export function siteUrl(): string {
	const fromEnv = process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
	if (fromEnv) return fromEnv;
	if (process.env.ENVIRONMENT === "staging") return STAGING_URL;
	return BRAND_URL;
}

function actionUrl(path: string, params: Record<string, string>): string {
	const url = new URL(path, `${siteUrl()}/`);
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return url.toString();
}

// PNG render of src/web/src/lib/assets/logo.svg (128px, generated via rsvg-convert).
// PNG data URI is used because SVG <img> is not supported in Gmail/Outlook.
const LOGO_DATA_URI = "data:image/png;base64,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";

const FONT_STACK =
	"'Outfit Variable', 'Outfit', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO_STACK = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

/** Mirrors the web design system (src/web/src/routes/layout.css). */
const COLORS = {
	brand: "#c74626", // coral-600
	heading: "#27211d", // sand-950
	body: "#554842", // sand-800
	note: "#7d6a5e", // sand-600
	muted: "#9a8577", // sand-500
	border: "#e4dcd4", // sand-200
	borderStrong: "#cfc2b6", // sand-300
	pageBg: "#faf8f6", // sand-50
	codeBg: "#f3efeb", // sand-100
	quoteBg: "#fef3f0", // coral-50
};

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/** Wraps template body content in the branded email layout (header, card, footer). */
function layout(props: { preview: string; body: string }): string {
	return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${BRAND_NAME}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
	img { border: 0; line-height: 100%; }
	body { margin: 0; padding: 0; }
</style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.pageBg};">
	<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(props.preview)}</div>
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.pageBg};">
		<tr>
			<td align="center" style="padding:32px 16px;">
				<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
					<tr>
						<td style="padding:0 0 24px;">
							<table role="presentation" cellpadding="0" cellspacing="0">
								<tr>
									<td><img src="${LOGO_DATA_URI}" width="44" height="44" alt="${BRAND_NAME}" style="display:block;" /></td>
									<td style="padding:0 0 0 12px;font-family:${FONT_STACK};font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${COLORS.heading};">${BRAND_NAME}</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td style="background-color:#ffffff;border:1px solid ${COLORS.border};border-radius:16px;padding:32px;font-family:${FONT_STACK};">${props.body}</td>
					</tr>
					<tr>
						<td style="padding:24px 16px 0;font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:${COLORS.muted};text-align:center;">
							© ${new Date().getFullYear()} ${BRAND_NAME} · ${BRAND_DOMAIN}<br />
							Diese E-Mail wurde automatisch versendet. Bitte antworte nicht auf diese E-Mail.
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

function heading(text: string): string {
	return `<h1 style="margin:0 0 16px;font-family:${FONT_STACK};font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${COLORS.heading};">${escapeHtml(text)}</h1>`;
}

function paragraph(text: string): string {
	return `<p style="margin:0 0 16px;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${COLORS.body};">${escapeHtml(text)}</p>`;
}

function tokenBox(token: string): string {
	return `<div style="margin:24px 0 0;padding:16px 20px;background-color:${COLORS.codeBg};border:1px dashed ${COLORS.borderStrong};border-radius:10px;font-family:${MONO_STACK};font-size:18px;font-weight:600;letter-spacing:2px;text-align:center;color:${COLORS.heading};">${escapeHtml(token)}</div>`;
}

/** Outlook-safe pill button. href is already built; still escape for the attribute. */
function ctaButton(href: string, label: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
		<tr>
			<td align="center" bgcolor="${COLORS.brand}" style="border-radius:999px;">
				<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;background-color:${COLORS.brand};">${escapeHtml(label)}</a>
			</td>
		</tr>
	</table>`;
}

function note(text: string): string {
	return `<p style="margin:16px 0 0;font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:${COLORS.note};">${escapeHtml(text)}</p>`;
}

type DetailRow = [label: string, value: string];

function detailList(rows: DetailRow[]): string {
	const cells = rows
		.map(
			([label, value]) =>
				`<tr><td style="padding:4px 16px 4px 0;vertical-align:top;font-family:${FONT_STACK};font-size:13px;color:${COLORS.note};white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:4px 0;font-family:${FONT_STACK};font-size:15px;line-height:1.5;color:${COLORS.heading};">${escapeHtml(value)}</td></tr>`,
		)
		.join("");
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${cells}</table>`;
}

function quoteBlock(text: string): string {
	return `<div style="margin:0 0 16px;padding:16px 20px;background-color:${COLORS.quoteBg};border-left:3px solid ${COLORS.brand};border-radius:0 10px 10px 0;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${COLORS.body};white-space:pre-wrap;">${escapeHtml(text)}</div>`;
}

function expiryLabel(hours: number): string {
	return `${hours} ${hours === 1 ? "Stunde" : "Stunden"}`;
}

export type EmailTemplateInput = {
	to: string | string[];
};

export type VerifyEmailInput = EmailTemplateInput & {
	token: string;
	expiresInHours?: number;
};

/** Verification link for new user and shelter owner accounts (24h default). */
export function verifyEmailTemplate({
	to,
	token,
	expiresInHours = 24,
}: VerifyEmailInput): MailOptions {
	const expiry = expiryLabel(expiresInHours);
	const recipient = Array.isArray(to) ? to[0] : to;
	const href = actionUrl("/verify", { email: recipient, token });
	const subject = "Bestätige deine E-Mail-Adresse";
	return {
		to,
		subject,
		text: `Bestätige deine E-Mail-Adresse

Schön, dass du bei Adoptier Lieber dabei bist! Um dein Konto zu aktivieren, öffne diesen Link:

${href}

Oder gib auf der Bestätigungsseite diesen Code ein:

${token}

Der Link ist ${expiry} gültig. Solltest du keine Registrierung vorgenommen haben, kannst du diese E-Mail einfach ignorieren.`,
		html: layout({
			preview: "Fast geschafft – bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.",
			body: [
				heading("Bestätige deine E-Mail-Adresse"),
				paragraph(
					"Schön, dass du bei Adoptier Lieber dabei bist! Um dein Konto zu aktivieren, klicke auf den Button:",
				),
				ctaButton(href, "E-Mail bestätigen"),
				note("Falls der Button nicht funktioniert, nutze diesen Code auf der Bestätigungsseite:"),
				tokenBox(token),
				note(
					`Der Link ist ${expiry} gültig. Solltest du keine Registrierung vorgenommen haben, kannst du diese E-Mail einfach ignorieren.`,
				),
			].join(""),
		}),
	};
}

export type ShelterRegistrationNotificationInput = EmailTemplateInput & {
	orgName: string;
	street: string;
	zip: string;
	city: string;
	website?: string;
	registrationNumber?: string;
	name: string;
	email: string;
	description?: string;
};

/** Internal notification about a new shelter registration awaiting verification. */
export function shelterRegistrationNotificationTemplate({
	to,
	orgName,
	street,
	zip,
	city,
	website,
	registrationNumber,
	name,
	email,
	description,
}: ShelterRegistrationNotificationInput): MailOptions {
	const subject = `Neue Tierheim-Registrierung: ${orgName}`;
	return {
		to,
		subject,
		text: `Neue Tierheim-Registrierung: ${orgName}

${orgName} hat sich registriert und wartet auf Freischaltung.

Organisation: ${orgName}
Adresse: ${street}, ${zip} ${city}
Webseite: ${website ?? "–"}
Registernummer: ${registrationNumber ?? "–"}
Kontakt: ${name} <${email}>

Beschreibung:
${description ?? "–"}`,
		html: layout({
			preview: `${orgName} hat sich registriert und wartet auf Freischaltung.`,
			body: [
				heading("Neue Tierheim-Registrierung"),
				paragraph(`${orgName} hat sich registriert und wartet auf Freischaltung.`),
				detailList([
					["Organisation", orgName],
					["Adresse", `${street}, ${zip} ${city}`],
					["Webseite", website ?? "–"],
					["Registernummer", registrationNumber ?? "–"],
					["Kontakt", `${name} <${email}>`],
				]),
				paragraph("Beschreibung:"),
				quoteBlock(description ?? "–"),
			].join(""),
		}),
	};
}

export type ContactRequestInput = EmailTemplateInput & {
	name: string;
	email?: string;
	message: string;
};

/** Internal forwarding of a contact form submission to the team inbox. */
export function contactRequestTemplate({
	to,
	name,
	email,
	message,
}: ContactRequestInput): MailOptions {
	const subject = `Kontaktanfrage von ${name}`;
	const emailDisplay = email?.trim() || "—";
	return {
		to,
		subject,
		text: `Kontaktanfrage von ${name}

Name: ${name}
E-Mail: ${emailDisplay}

Nachricht:
${message}`,
		html: layout({
			preview: `${name} hat über das Kontaktformular angefragt.`,
			body: [
				heading("Kontaktanfrage"),
				detailList([
					["Name", name],
					["E-Mail", emailDisplay],
				]),
				paragraph("Nachricht:"),
				quoteBlock(message),
			].join(""),
		}),
	};
}

export type AccountDeletionInput = EmailTemplateInput & {
	token: string;
	expiresInHours?: number;
};

/** Confirmation link to complete an account deletion request (1h default). */
export function accountDeletionTemplate({
	to,
	token,
	expiresInHours = 1,
}: AccountDeletionInput): MailOptions {
	const expiry = expiryLabel(expiresInHours);
	const href = actionUrl("/delete-account", { token });
	const subject = "Konto löschen – Bestätigung";
	return {
		to,
		subject,
		text: `Konto löschen – Bestätigung

Du hast die Löschung deines Kontos angefordert. Öffne diesen Link und bestätige die Löschung dort. Du musst angemeldet sein:

${href}

Oder gib auf der Profilseite diesen Code ein:

${token}

Achtung: Die Löschung ist endgültig und kann nicht rückgängig gemacht werden. Der Link ist ${expiry} gültig. Falls du die Löschung nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
		html: layout({
			preview: "Bestätige die Löschung deines Kontos über den Button.",
			body: [
				heading("Konto löschen"),
				paragraph(
					"Du hast die Löschung deines Kontos angefordert. Klicke auf den Button und bestätige die Löschung auf der nächsten Seite. Du musst angemeldet sein.",
				),
				ctaButton(href, "Löschung bestätigen"),
				note("Falls der Button nicht funktioniert, nutze diesen Code auf der Profilseite:"),
				tokenBox(token),
				note(
					`Achtung: Die Löschung ist endgültig und kann nicht rückgängig gemacht werden. Der Link ist ${expiry} gültig. Falls du die Löschung nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
				),
			].join(""),
		}),
	};
}

export type PasswordResetInput = EmailTemplateInput & {
	token: string;
	expiresInHours?: number;
};

/** Notify the user that their password was changed. */
export function passwordChangedTemplate({ to }: EmailTemplateInput): MailOptions {
	const subject = "Dein Passwort wurde geändert";
	return {
		to,
		subject,
		text: `Dein Passwort wurde geändert

Das Passwort deines Adoptier-Lieber-Kontos wurde gerade geändert. Falls du das nicht selbst gemacht hast, setze dein Passwort sofort zurück.`,
		html: layout({
			preview: "Das Passwort deines Kontos wurde geändert.",
			body: [
				heading("Dein Passwort wurde geändert"),
				paragraph(
					"Das Passwort deines Adoptier-Lieber-Kontos wurde gerade geändert. Falls du das nicht selbst gemacht hast, setze dein Passwort sofort zurück.",
				),
			].join(""),
		}),
	};
}

/** Reset link for the password reset flow (1h default). */
export function passwordResetTemplate({
	to,
	token,
	expiresInHours = 1,
}: PasswordResetInput): MailOptions {
	const expiry = expiryLabel(expiresInHours);
	const recipient = Array.isArray(to) ? to[0] : to;
	const href = actionUrl("/reset-password", { email: recipient, token });
	const subject = "Passwort zurücksetzen";
	return {
		to,
		subject,
		text: `Passwort zurücksetzen

Du hast ein Zurücksetzen deines Passworts angefordert. Öffne diesen Link und setze dort dein neues Passwort:

${href}

Oder gib auf der Seite diesen Code zusammen mit deinem neuen Passwort ein:

${token}

Der Link ist ${expiry} gültig. Falls du das Zurücksetzen nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
		html: layout({
			preview: "Setze dein Passwort über den Button zurück.",
			body: [
				heading("Passwort zurücksetzen"),
				paragraph(
					"Du hast ein Zurücksetzen deines Passworts angefordert. Klicke auf den Button und setze dort dein neues Passwort:",
				),
				ctaButton(href, "Passwort zurücksetzen"),
				note("Falls der Button nicht funktioniert, nutze diesen Code auf der Seite:"),
				tokenBox(token),
				note(
					`Der Link ist ${expiry} gültig. Falls du das Zurücksetzen nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
				),
			].join(""),
		}),
	};
}

export type ShelterDecisionInput = EmailTemplateInput & {
	orgName: string;
	reason?: string;
};

export function shelterApprovedTemplate({ to, orgName }: ShelterDecisionInput): MailOptions {
	const href = `${siteUrl()}/shelter`;
	const subject = "Euer Tierheim ist freigeschaltet";
	return {
		to,
		subject,
		text: `Euer Tierheim ist freigeschaltet

${orgName} ist jetzt verifiziert. Ihr könnt Tiere veröffentlichen.

${href}`,
		html: layout({
			preview: `${orgName} ist freigeschaltet.`,
			body: [
				heading("Ihr seid freigeschaltet"),
				paragraph(`${orgName} ist jetzt verifiziert. Ihr könnt Tiere veröffentlichen.`),
				ctaButton(href, "Zum Tierheim-Bereich"),
			].join(""),
		}),
	};
}

export function shelterRejectedTemplate({ to, orgName, reason }: ShelterDecisionInput): MailOptions {
	const subject = "Entscheidung zu eurer Registrierung";
	return {
		to,
		subject,
		text: `Entscheidung zu eurer Registrierung

${orgName} wurde nicht freigeschaltet.

Begründung:
${reason ?? "–"}`,
		html: layout({
			preview: `${orgName} wurde nicht freigeschaltet.`,
			body: [
				heading("Eure Registrierung"),
				paragraph(`${orgName} wurde nicht freigeschaltet.`),
				paragraph("Begründung:"),
				quoteBlock(reason ?? "–"),
			].join(""),
		}),
	};
}

export type AdminInviteInput = EmailTemplateInput & {
	token: string;
	expiresInHours?: number;
};

export function adminInviteTemplate({ to, token, expiresInHours = 168 }: AdminInviteInput): MailOptions {
	const expiry = expiryLabel(expiresInHours);
	const href = actionUrl("/invite", { token });
	const subject = "Einladung ins Admin-Team";
	return {
		to,
		subject,
		text: `Einladung ins Admin-Team

Du wurdest ins Admin-Team von Adoptier Lieber eingeladen. Öffne diesen Link:

${href}

Der Link ist ${expiry} gültig.`,
		html: layout({
			preview: "Du wurdest ins Admin-Team eingeladen.",
			body: [
				heading("Einladung ins Admin-Team"),
				paragraph("Du wurdest ins Admin-Team von Adoptier Lieber eingeladen."),
				ctaButton(href, "Einladung annehmen"),
				note(`Der Link ist ${expiry} gültig.`),
			].join(""),
		}),
	};
}

export type ShelterStaffInviteInput = EmailTemplateInput & {
	orgName: string;
	token: string;
	existingUser: boolean;
};

export function shelterStaffInviteTemplate({
	to,
	orgName,
	token,
	existingUser,
}: ShelterStaffInviteInput): MailOptions {
	const href = existingUser
		? actionUrl("/login", { next: "/shelter" })
		: actionUrl("/register", { invite: token });
	const subject = `Einladung zu ${orgName}`;
	return {
		to,
		subject,
		text: `Einladung zu ${orgName}

Du wurdest zum Team von ${orgName} eingeladen.

${href}`,
		html: layout({
			preview: `Einladung zum Team von ${orgName}.`,
			body: [
				heading("Team-Einladung"),
				paragraph(`Du wurdest zum Team von ${orgName} eingeladen.`),
				ctaButton(href, existingUser ? "Anmelden und beitreten" : "Konto erstellen"),
			].join(""),
		}),
	};
}

export type NewThreadNotifyInput = EmailTemplateInput & {
	animalName: string;
	adopterName: string;
	excerpt: string;
	threadId: string;
};

export function newThreadNotifyTemplate({
	to,
	animalName,
	adopterName,
	excerpt,
	threadId,
}: NewThreadNotifyInput): MailOptions {
	const href = `${siteUrl()}/shelter/messages/${threadId}`;
	const subject = `Neue Anfrage: ${animalName} · ${adopterName}`;
	return {
		to,
		subject,
		text: `Neue Anfrage: ${animalName} · ${adopterName}

${excerpt}

${href}`,
		html: layout({
			preview: `Neue Anfrage zu ${animalName}.`,
			body: [
				heading("Neue Anfrage"),
				paragraph(`${adopterName} interessiert sich für ${animalName}.`),
				quoteBlock(excerpt || "–"),
				ctaButton(href, "In Nachrichten öffnen"),
			].join(""),
		}),
	};
}

export type DigestNotifyInput = EmailTemplateInput & {
	orgName: string;
	threads: { animalName: string; adopterName: string; hours: number; threadId: string }[];
};

export function unansweredDigestTemplate({ to, orgName, threads }: DigestNotifyInput): MailOptions {
	const href = `${siteUrl()}/shelter/messages`;
	const lines = threads
		.map((row) => `• ${row.animalName} · ${row.adopterName} · ${row.hours}h`)
		.join("\n");
	return {
		to,
		subject: `Offene Anfragen: ${threads.length} bei ${orgName}`,
		text: `Offene Anfragen bei ${orgName}:

${lines}

${href}`,
		html: layout({
			preview: `${threads.length} unbeantwortete Anfragen.`,
			body: [
				heading("Offene Anfragen"),
				paragraph(
					`${orgName} hat ${threads.length} Anfrage${threads.length === 1 ? "" : "n"} länger als 48 Stunden unbeantwortet.`,
				),
				quoteBlock(lines),
				ctaButton(href, "In Nachrichten öffnen"),
			].join(""),
		}),
	};
}
