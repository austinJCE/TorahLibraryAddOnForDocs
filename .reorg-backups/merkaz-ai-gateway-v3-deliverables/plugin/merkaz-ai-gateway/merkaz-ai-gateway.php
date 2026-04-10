<?php
/**
 * Plugin Name: Merkaz AI Gateway
 * Description: Secure AI gateway and orchestration layer for the Merkaz Google Docs add-on.
 * Version: 0.3.0
 * Author: OpenAI
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MERKAZ_AI_GATEWAY_VERSION', '0.3.0');
define('MERKAZ_AI_GATEWAY_FILE', __FILE__);
define('MERKAZ_AI_GATEWAY_DIR', plugin_dir_path(__FILE__));
define('MERKAZ_AI_GATEWAY_OPTION', 'merkaz_ai_gateway_options');
define('MERKAZ_AI_GATEWAY_LOG_TABLE', 'merkaz_ai_gateway_logs');

require_once MERKAZ_AI_GATEWAY_DIR . 'includes/class-merkaz-ai-gateway.php';

register_activation_hook(__FILE__, ['Merkaz_AI_Gateway', 'activate']);
register_deactivation_hook(__FILE__, ['Merkaz_AI_Gateway', 'deactivate']);

add_action('plugins_loaded', function () {
    Merkaz_AI_Gateway::instance();
});
