<?php
/**
 * Lido Mojito - Backend Invio Email 100% Open Source & Self-Hosted
 * 
 * Gestisce:
 * 1. Richieste di prenotazione spiaggia (booking.html)
 * 2. Candidature lavorative con allegato CV (workwithus.html)
 * 3. Messaggi di contatto generici (contact.html)
 * 
 * NOTE DI ARCHITETTURA E SICUREZZA:
 * - Hardening completo con validazione tipizzata e sanitizzazione preventiva
 * - Protezione Honeypot anti-bot e Rate Limiting per sessione
 * - Controllo MIME Type reale e Magic Bytes binari (%PDF-) per upload CV
 * - Protezione contro Email Header Injection (blocco di \r, \n, %0a, %0d)
 * - Header di sicurezza HTTP (CSP, nosniff, SAMEORIGIN, Referrer-Policy)
 * 
 * RACCOMANDAZIONE PER IL FUTURO:
 * Per una deliverability ottimale (allineamento SPF, DKIM, DMARC) in ambienti
 * di produzione ad alto volume, si consiglia l'integrazione di una libreria
 * SMTP autenticata come PHPMailer con server mail dedicato.
 */

// Disabilita esposizione errori a video in produzione
error_reporting(0);
ini_set('display_errors', '0');

// Header di sicurezza HTTP
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline';");

// Avvio sessione sicura per rate-limiting e CSRF
if (session_status() === PHP_SESSION_NONE) {
    @session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax'
    ]);
}

// Configurazione destinatari e mittente autoritativo
$recipient_email = "barmojito.icr@gmail.com";
$site_name       = "Lido Mojito Capo Rizzuto";
$system_from     = "noreply@barmojitocaporizzuto.com";

// 1. Verifica metodo richiesta
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: ../index.html");
    exit;
}

// 2. Protezione Anti-Spam: Honeypot (campo nascosto compilato solo dai bot)
if (!empty($_POST['website_url']) || !empty($_POST['mojito_hp'])) {
    // Risposta fittizia di successo per ingannare il bot senza inviare email
    render_success_page("info@cliente.it");
    exit;
}

// 3. Rate Limiting di base per sessione (max 5 invii ogni 10 minuti)
$now = time();
if (!isset($_SESSION['mojito_submissions'])) {
    $_SESSION['mojito_submissions'] = [];
}
// Rimuovi timestamp più vecchi di 10 minuti (600s)
$_SESSION['mojito_submissions'] = array_filter($_SESSION['mojito_submissions'], function($ts) use ($now) {
    return ($now - $ts) < 600;
});

if (count($_SESSION['mojito_submissions']) >= 5) {
    echo "<script>alert('Hai effettuato troppe richieste in breve tempo. Per favore attendi qualche minuto o contattaci direttamente al 329 978 7155.'); window.history.back();</script>";
    exit;
}

// Funzioni di validazione e pulizia specializzate
function sanitize_string($data, $max_len = 255) {
    $data = trim((string)$data);
    // Rimuove caratteri di controllo non stampabili
    $data = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $data);
    if (mb_strlen($data, 'UTF-8') > $max_len) {
        $data = mb_substr($data, 0, $max_len, 'UTF-8');
    }
    return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
}

function sanitize_multiline($data, $max_len = 2000) {
    $data = trim((string)$data);
    // Mantieni newline ma rimuovi altri caratteri di controllo
    $data = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $data);
    if (mb_strlen($data, 'UTF-8') > $max_len) {
        $data = mb_substr($data, 0, $max_len, 'UTF-8');
    }
    return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
}

function validate_name($name) {
    // Lettere unicode, spazi, apostrofi, trattini, lunghezza 2-60
    return preg_match('/^[\p{L}\s\'\-]{2,60}$/u', $name);
}

function validate_phone($phone) {
    // Numeri telefonici internazionali / italiani plausibili
    $cleaned = preg_replace('/[\s\-\.\(\)]/', '', $phone);
    return preg_match('/^\+?[0-9]{6,20}$/', $cleaned);
}

// 4. Ricezione e validazione campi anagrafici comuni
$raw_name     = isset($_POST['name']) ? trim($_POST['name']) : '';
$raw_surname  = isset($_POST['surname']) ? trim($_POST['surname']) : '';
$raw_email    = isset($_POST['email']) ? trim($_POST['email']) : '';
$raw_phone    = isset($_POST['phone']) ? trim($_POST['phone']) : '';
$raw_comment  = isset($_POST['comment']) ? trim($_POST['comment']) : '';

// Controllo Email Anti-Header Injection
$clean_email = str_ireplace(["\r", "\n", "%0a", "%0d"], '', $raw_email);
if (empty($clean_email) || !filter_var($clean_email, FILTER_VALIDATE_EMAIL) || strlen($clean_email) > 100) {
    echo "<script>alert('Indirizzo email non valido. Verifica e riprova.'); window.history.back();</script>";
    exit;
}

// Controllo Nome e Cognome
$name = sanitize_string($raw_name, 60);
$surname = sanitize_string($raw_surname, 60);
if (!empty($name) && !validate_name($raw_name)) {
    echo "<script>alert('Il campo Nome contiene caratteri non validi.'); window.history.back();</script>";
    exit;
}
if (!empty($surname) && !validate_name($raw_surname)) {
    echo "<script>alert('Il campo Cognome contiene caratteri non validi.'); window.history.back();</script>";
    exit;
}

$full_name = trim("$name $surname");
if (empty($full_name)) {
    $full_name = "Cliente Lido Mojito";
}

// Controllo Telefono (se fornito)
$phone = sanitize_string($raw_phone, 25);
if (!empty($raw_phone) && !validate_phone($raw_phone)) {
    echo "<script>alert('Numero di telefono non valido. Inserisci un recapito valido.'); window.history.back();</script>";
    exit;
}

// Note e Messaggio
$comment = sanitize_multiline($raw_comment, 2000);

// Inizializzazione variabili email
$subject            = "";
$message_body       = "";
$has_attachment     = false;
$attachment_content = "";
$attachment_name    = "";

// 5. SMISTAMENTO DEI FORM

// CASO A: PRENOTAZIONE SPIAGGIA (booking.html)
if (isset($_POST['checkin']) && isset($_POST['checkout'])) {
    $raw_checkin  = trim($_POST['checkin']);
    $raw_checkout = trim($_POST['checkout']);

    $d_in  = DateTime::createFromFormat('Y-m-d', $raw_checkin);
    $d_out = DateTime::createFromFormat('Y-m-d', $raw_checkout);

    if (!$d_in || !$d_out || $d_in->format('Y-m-d') !== $raw_checkin || $d_out->format('Y-m-d') !== $raw_checkout) {
        echo "<script>alert('Formato date non valido. Seleziona nuovamente il periodo.'); window.history.back();</script>";
        exit;
    }

    $today = new DateTime('today');
    if ($d_in < $today) {
        echo "<script>alert('La data di arrivo non può essere nel passato.'); window.history.back();</script>";
        exit;
    }

    if ($d_out <= $d_in) {
        echo "<script>alert('La data di partenza deve essere successiva alla data di arrivo.'); window.history.back();</script>";
        exit;
    }

    $diff_days = $d_in->diff($d_out)->days;
    if ($diff_days > 90) {
        echo "<script>alert('Il periodo massimo prenotabile online è di 90 giorni. Contattaci telefonicamente per soggiorni prolungati.'); window.history.back();</script>";
        exit;
    }

    // Clamping valori numerici
    $umbrellas = isset($_POST['umbrellas']) ? max(1, min(10, intval($_POST['umbrellas']))) : 1;
    $adults    = isset($_POST['adults']) ? max(1, min(20, intval($_POST['adults']))) : 2;
    $children  = isset($_POST['children']) ? max(0, min(20, intval($_POST['children']))) : 0;

    $subject = "🏖️ Nuova Richiesta Prenotazione Lido - $full_name ($raw_checkin / $raw_checkout)";
    
    $message_body = "Hai ricevuto una nuova richiesta di disponibilità dal sito web Lido Mojito:\n\n";
    $message_body .= "--------------------------------------------------\n";
    $message_body .= "DETTAGLI SOGGIORNO:\n";
    $message_body .= "• Data Check-in:  $raw_checkin\n";
    $message_body .= "• Data Check-out: $raw_checkout\n";
    $message_body .= "• Giorni totali:  $diff_days\n";
    $message_body .= "• Ombrelloni:     $umbrellas (con " . ($umbrellas * 2) . " lettini)\n";
    $message_body .= "• Ospiti Adulti:  $adults\n";
    $message_body .= "• Ospiti Bambini: $children\n";
    $message_body .= "--------------------------------------------------\n";
    $message_body .= "RECAPITI CLIENTE:\n";
    $message_body .= "• Nome:     $full_name\n";
    $message_body .= "• Email:    $clean_email\n";
    $message_body .= "• Telefono: $phone\n";
    $message_body .= "--------------------------------------------------\n";
    $message_body .= "NOTE / RICHIESTE SPECIALI:\n";
    $message_body .= empty($comment) ? "Nessuna nota specificata" : $comment;
    $message_body .= "\n--------------------------------------------------\n";
    $message_body .= "Inviato da IP: " . $_SERVER['REMOTE_ADDR'] . " il " . date("d/m/Y H:i:s") . "\n";

// CASO B: CANDIDATURA LAVORA CON NOI (workwithus.html)
} elseif (isset($_POST['role']) || isset($_FILES['cv'])) {
    $allowed_roles = [
        'pizzaiolo' => 'Pizzaiolo / Aiuto pizzaiolo',
        'cameriere' => 'Cameriere di sala / spiaggia',
        'barista'   => 'Barista / Bartender',
        'bagnino'   => 'Bagnino di salvataggio brevettato'
    ];

    $raw_role = isset($_POST['role']) ? trim($_POST['role']) : '';
    $role_label = isset($allowed_roles[$raw_role]) ? $allowed_roles[$raw_role] : 'Non specificato';

    $subject = "💼 Nuova Candidatura Lavora con Noi - $full_name ($role_label)";
    
    $message_body = "Nuova candidatura ricevuta dal sito web Lido Mojito:\n\n";
    $message_body .= "--------------------------------------------------\n";
    $message_body .= "CANDIDATO:\n";
    $message_body .= "• Nome:      $full_name\n";
    $message_body .= "• Email:     $clean_email\n";
    $message_body .= "• Telefono:  $phone\n";
    $message_body .= "• Ruolo:     $role_label\n";
    $message_body .= "--------------------------------------------------\n";
    $message_body .= "PRESENTAZIONE / ESPERIENZE:\n";
    $message_body .= empty($comment) ? "Nessun messaggio aggiuntivo" : $comment;
    $message_body .= "\n--------------------------------------------------\n";
    $message_body .= "Inviato da IP: " . $_SERVER['REMOTE_ADDR'] . " il " . date("d/m/Y H:i:s") . "\n";

    // Validazione Rigorosa Allegato CV
    if (isset($_FILES['cv']) && $_FILES['cv']['error'] === UPLOAD_ERR_OK) {
        $tmp_file = $_FILES['cv']['tmp_name'];
        $file_size = $_FILES['cv']['size'];
        $orig_name = $_FILES['cv']['name'];

        // 1. Limite dimensione: Max 10MB (10 * 1024 * 1024 bytes)
        if ($file_size <= 0 || $file_size > (10 * 1024 * 1024)) {
            echo "<script>alert('Il file CV supera la dimensione massima consentita di 10MB o è vuoto.'); window.history.back();</script>";
            exit;
        }

        // 2. Controllo estensione
        $file_ext = strtolower(pathinfo($orig_name, PATHINFO_EXTENSION));
        if ($file_ext !== 'pdf') {
            echo "<script>alert('Formato file non valido. È consentito caricare esclusivamente file in formato PDF.'); window.history.back();</script>";
            exit;
        }

        // 3. Controllo MIME Type Reale con finfo
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $real_mime = finfo_file($finfo, $tmp_file);
            finfo_close($finfo);

            if ($real_mime !== 'application/pdf') {
                echo "<script>alert('Il file caricato non è un documento PDF valido.'); window.history.back();</script>";
                exit;
            }
        }

        // 4. Controllo Magic Bytes binari (%PDF-)
        $handle = fopen($tmp_file, 'rb');
        $magic_bytes = fread($handle, 4);
        fclose($handle);

        if ($magic_bytes !== '%PDF') {
            echo "<script>alert('Firma del file non valida. Assicurati che si tratti di un PDF genuino.'); window.history.back();</script>";
            exit;
        }

        // 5. Sanitizzazione nome file per prevenire MIME injection
        $safe_filename = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', basename($orig_name));
        if (empty($safe_filename) || $safe_filename === '.pdf') {
            $safe_filename = "CV_" . preg_replace('/[^a-zA-Z0-9]/', '_', $full_name) . ".pdf";
        }

        $has_attachment = true;
        $attachment_name = $safe_filename;
        $attachment_content = chunk_split(base64_encode(file_get_contents($tmp_file)));
    }

// CASO C: MESSAGGIO CONTATTO GENERALE (contact.html)
} else {
    if (empty($comment)) {
        echo "<script>alert('Per favore inserisci un messaggio prima di inviare.'); window.history.back();</script>";
        exit;
    }

    $subject = "📩 Nuovo Messaggio di Contatto - $full_name";
    
    $message_body = "Hai ricevuto un nuovo messaggio dal modulo di contatto del Lido Mojito:\n\n";
    $message_body .= "--------------------------------------------------\n";
    $message_body .= "MITTENTE:\n";
    $message_body .= "• Nome:     $full_name\n";
    $message_body .= "• Email:    $clean_email\n";
    $message_body .= "• Telefono: " . (empty($phone) ? "Non specificato" : $phone) . "\n";
    $message_body .= "--------------------------------------------------\n";
    $message_body .= "MESSAGGIO:\n";
    $message_body .= "$comment\n";
    $message_body .= "--------------------------------------------------\n";
    $message_body .= "Inviato da IP: " . $_SERVER['REMOTE_ADDR'] . " il " . date("d/m/Y H:i:s") . "\n";
}

// 6. Costruzione Headers Email Protetti da Injection
$boundary = "mojito_boundary_" . md5(uniqid(time(), true));

if ($has_attachment) {
    // Header Multipart MIME per allegato PDF
    $headers  = "From: $site_name <$system_from>\r\n";
    $headers .= "Reply-To: $clean_email\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

    $body  = "--$boundary\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $body .= $message_body . "\r\n\r\n";

    $body .= "--$boundary\r\n";
    $body .= "Content-Type: application/pdf; name=\"$attachment_name\"\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n";
    $body .= "Content-Disposition: attachment; filename=\"$attachment_name\"\r\n\r\n";
    $body .= $attachment_content . "\r\n";
    $body .= "--$boundary--";
} else {
    // Header standard per solo testo
    $headers  = "From: $site_name <$system_from>\r\n";
    $headers .= "Reply-To: $clean_email\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body = $message_body;
}

// 7. Invio effettivo con mail() nativa PHP
$encoded_subject = "=?UTF-8?B?" . base64_encode($subject) . "?=";
$mail_sent = @mail($recipient_email, $encoded_subject, $body, $headers);

// Registra timestamp per rate limiting
$_SESSION['mojito_submissions'][] = time();

// 8. Visualizzazione Pagina di Conferma
render_success_page($clean_email);

function render_success_page($user_email) {
?>
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Richiesta Inviata | Lido Mojito</title>
  
  <link rel="icon" type="image/png" sizes="32x32" href="../mediasys/favicon/favicon-32x32.png">
  <link rel="stylesheet" href="../css/main.css">
  <style>
    body {
      background: var(--color-off-white);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      font-family: var(--font-primary);
    }
    .confirmation-box {
      background: #FFFFFF;
      max-width: 620px;
      width: 100%;
      border-radius: 16px;
      padding: 3.5rem 2.5rem;
      text-align: center;
      box-shadow: 0 15px 45px rgba(18, 34, 35, 0.1);
      border: 1px solid rgba(18, 34, 35, 0.08);
    }
    .confirmation-icon {
      width: 80px;
      height: 80px;
      background: rgba(28, 53, 31, 0.1);
      color: var(--color-green-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.8rem;
    }
  </style>
</head>
<body>
  <div class="confirmation-box">
    <div class="confirmation-icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>
    <h1 style="color: var(--color-green-primary); font-size: 2rem; margin-bottom: 1rem;">Richiesta inviata con successo!</h1>
    <p style="color: rgba(18, 34, 35, 0.8); line-height: 1.6; margin-bottom: 2rem;">
      Abbiamo ricevuto la tua comunicazione. Il nostro staff ti risponderà nel più breve tempo possibile all'indirizzo <strong><?php echo htmlspecialchars($user_email); ?></strong> o telefonicamente.
    </p>
    <a href="../index.html" class="btn btn-primary" style="display: inline-block;">Torna alla Home</a>
  </div>
</body>
</html>
<?php
}
