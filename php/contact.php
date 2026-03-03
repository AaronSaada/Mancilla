<?php
header('Content-Type: application/json; charset=utf-8');

define('RECIPIENT',        'contact@mancilla.fr');
define('SENDER_DOMAIN',    'mancilla.fr');
define('RECAPTCHA_SECRET', '6LcpZn4sAAAAALonENCYRnKWXvju6QrGNc5nYr-v');
define('RECAPTCHA_MIN',    0.5);
define('RATE_LIMIT',       3);

function json_error(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $msg]);
    exit;
}
function json_ok(string $msg): void {
    echo json_encode(['success' => true, 'message' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_error('Méthode non autorisée.', 405);

session_start();
$now = time();
if (!isset($_SESSION['cf_sends'])) $_SESSION['cf_sends'] = [];
$_SESSION['cf_sends'] = array_filter($_SESSION['cf_sends'], fn($t) => ($now - $t) < 3600);
if (count($_SESSION['cf_sends']) >= RATE_LIMIT) json_error('Trop de tentatives. Réessayez dans une heure.', 429);

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) json_error('Données invalides.');

if (!empty($data['website'])) json_ok('Message envoyé ! Je vous réponds sous 24h.');

$token = $data['recaptcha_token'] ?? '';
if (empty($token)) json_error('Vérification anti-bot échouée.');

$verify = file_get_contents('https://www.google.com/recaptcha/api/siteverify', false,
    stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query([
            'secret'   => RECAPTCHA_SECRET,
            'response' => $token,
            'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
        ]),
    ]])
);
$rc = json_decode($verify, true);
if (!isset($rc['success']) || !$rc['success'] || ($rc['score'] ?? 0) < RECAPTCHA_MIN) {
    json_error('Vérification anti-bot échouée. Veuillez réessayer.');
}

$name    = trim(strip_tags($data['name']    ?? ''));
$email   = trim(strip_tags($data['email']   ?? ''));
$service = trim(strip_tags($data['service'] ?? ''));
$message = trim(strip_tags($data['message'] ?? ''));

// Longueurs & formats
if (empty($name)    || mb_strlen($name) > 100)    json_error('Nom invalide.');
if (empty($email)   || mb_strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) json_error('Email invalide.');
if (empty($message) || mb_strlen($message) < 10 || mb_strlen($message) > 5000) json_error('Message invalide.');
if (!empty($service) && mb_strlen($service) > 100) json_error('Service invalide.');

// Injection d'en-têtes SMTP (CRLF)
foreach ([$name, $email, $service, $message] as $f) {
    if (preg_match('/[\r\n]/', $f)) json_error('Contenu invalide.');
}

// Nom : lettres unicode, chiffres, espaces, tirets, points, apostrophes, &
if (!preg_match('/^[\p{L}\p{N}\s\'\-\.\,\&]{2,100}$/u', $name)) json_error('Nom invalide.');

// Message : pas d'URLs (anti-spam)
if (preg_match('/https?:\/\//i', $message)) json_error('Les liens ne sont pas autorisés dans le message.');

// Service : whitelist stricte
$allowed_services = ['', 'Audit IT gratuit', 'Cloud & Microsoft 365', 'Maintenance informatique', 'Cybersécurité', 'Autre demande'];
if (!in_array($service, $allowed_services, true)) json_error('Service invalide.');

$service_label = !empty($service) ? htmlspecialchars($service) : 'Non précisé';
$subject = '=?UTF-8?B?' . base64_encode('[mancilla.fr] Nouveau message de ' . $name) . '?=';

$body  = "Nouveau message reçu via mancilla.fr\n";
$body .= str_repeat('-', 40) . "\n\n";
$body .= "Nom     : {$name}\n";
$body .= "Email   : {$email}\n";
$body .= "Service : {$service_label}\n";
$body .= "IP      : " . ($_SERVER['REMOTE_ADDR'] ?? 'inconnue') . "\n";
$body .= "Date    : " . date('d/m/Y à H:i') . "\n\n";
$body .= str_repeat('-', 40) . "\n\nMESSAGE :\n\n{$message}\n\n";
$body .= str_repeat('-', 40) . "\nRépondre à : {$email}\n";

$headers  = "From: noreply@" . SENDER_DOMAIN . "\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";

$sent = mail(RECIPIENT, $subject, $body, $headers);
if (!$sent) json_error('Erreur lors de l\'envoi.', 500);

$_SESSION['cf_sends'][] = $now;
json_ok('Message envoyé ! Je vous réponds sous 24h.');