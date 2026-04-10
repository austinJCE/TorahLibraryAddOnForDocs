<?php

if (!defined('ABSPATH')) {
    exit;
}

class Merkaz_AI_Gateway {
    private static $instance = null;
    private $option_name = MERKAZ_AI_GATEWAY_OPTION;

    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public static function activate() {
        global $wpdb;
        $table = $wpdb->prefix . MERKAZ_AI_GATEWAY_LOG_TABLE;
        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE {$table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            created_at datetime NOT NULL,
            route varchar(100) NOT NULL,
            mode varchar(50) NOT NULL,
            provider varchar(80) NOT NULL,
            model varchar(120) NOT NULL,
            auth_mode varchar(30) NOT NULL,
            integration_key varchar(100) NOT NULL,
            user_hash varchar(190) DEFAULT '',
            request_id varchar(100) DEFAULT '',
            context_mode varchar(30) DEFAULT '',
            topic varchar(255) DEFAULT '',
            success tinyint(1) NOT NULL DEFAULT 0,
            status_code int(11) NOT NULL DEFAULT 0,
            latency_ms int(11) NOT NULL DEFAULT 0,
            prompt_tokens int(11) NOT NULL DEFAULT 0,
            completion_tokens int(11) NOT NULL DEFAULT 0,
            total_tokens int(11) NOT NULL DEFAULT 0,
            error_message text,
            meta_json longtext,
            PRIMARY KEY  (id),
            KEY created_at (created_at),
            KEY integration_key (integration_key),
            KEY user_hash (user_hash),
            KEY provider (provider),
            KEY success (success)
        ) {$charset_collate};";
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);

        if (!get_option(MERKAZ_AI_GATEWAY_OPTION)) {
            add_option(MERKAZ_AI_GATEWAY_OPTION, self::default_options());
        }
    }

    public static function deactivate() {
    }

    public static function default_options() {
        return [
            'enabled' => 1,
            'integration_key_id' => 'google-docs-addon',
            'shared_secret' => wp_generate_password(48, true, true),
            'allowed_clock_skew' => 300,
            'daily_limit_total' => 500,
            'daily_limit_per_user' => 25,
            'cooldown_seconds' => 900,
            'log_retention_days' => 30,
            'allow_advanced_tab' => 1,
            'default_modal_tab' => 'basic',
            'allow_user_keys' => 1,
            'allow_model_selection' => 1,
            'allow_saved_keys' => 1,
            'default_provider_alias_label' => 'Default',
            'default_provider_description' => 'Uses the site-managed workflow so the site can change models, prompts, and orchestration without add-on updates.',
            'default_route_mode' => 'proposal_refine',
            'default_provider' => 'openai',
            'default_model' => 'gpt-4.1-mini',
            'review_provider' => 'anthropic',
            'review_model' => 'claude-3-7-sonnet-latest',
            'merge_provider' => 'openai',
            'merge_model' => 'gpt-4.1-mini',
            'default_duration' => 45,
            'default_audience' => 'Adult learners',
            'default_lesson_style' => 'Interactive shiur',
            'policy_note' => "Basic Mode uses Merkaz-managed AI and does not require an API key. Advanced Mode can use a request-level user key. Request-level keys are not stored by this plugin. Review AI output before teaching or publishing.",
            'help_note' => 'Avoid including sensitive or confidential information in prompts. The website can change defaults, cooldowns, labels, and orchestration behavior without redeploying the add-on.',
            'status_note' => 'The add-on is loading gateway defaults and limits from the Merkaz website.',
            'quick_actions_note' => 'Quick actions use the same site-managed defaults unless Advanced Mode overrides them.',
            'ui_config_json' => wp_json_encode([
                'basicTabTitle' => 'Basic',
                'advancedTabTitle' => 'Advanced',
                'basicDescription' => 'Use the site defaults. Just describe what you want to generate.',
                'advancedDescription' => 'Choose a provider, model, and optional request-level key.',
                'basicGenerateLabel' => 'Generate & Insert',
                'countdownPrefix' => 'Please wait',
                'countdownSuffix' => 'before the next site-managed request.',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            'prompt_templates_json' => wp_json_encode([
                'lesson' => "You are an expert Jewish educator writing for a Google Docs add-on. Create a polished lesson draft with clear headings, practical flow, discussion prompts, and classroom-ready language.\n\nContext mode: {{context_mode}}\nSource: {{topic}}\nAudience: {{audience}}\nDuration minutes: {{duration}}\nLesson style: {{lesson_style}}\nInclude original / Hebrew: {{include_original}}\nInclude translation: {{include_translation}}\nInclude transliteration: {{include_transliteration}}\nInclude educator notes: {{include_educator_notes}}\nInclude discussion prompts: {{include_discussion_prompts}}\nAdditional instructions: {{additional_instructions}}\n\nReturn JSON only with keys title, content, warnings.",
                'refine' => "Refine the following draft into a more coherent and polished lesson while preserving factual caution. Return JSON only with keys title, content, warnings.\n\nDraft:\n{{draft}}",
                'merge' => "Combine the following lesson proposals into one strong final lesson. Keep the best elements, remove redundancy, and return JSON only with keys title, content, warnings.\n\n{{responses}}",
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            'providers' => [
                'openai' => [
                    'label' => 'OpenAI',
                    'api_key' => '',
                    'base_url' => 'https://api.openai.com/v1/responses',
                    'models' => "gpt-4.1-mini\ngpt-4.1\ngpt-4o-mini",
                ],
                'anthropic' => [
                    'label' => 'Anthropic',
                    'api_key' => '',
                    'base_url' => 'https://api.anthropic.com/v1/messages',
                    'models' => "claude-3-7-sonnet-latest\nclaude-3-5-sonnet-latest",
                ],
                'google' => [
                    'label' => 'Google Gemini',
                    'api_key' => '',
                    'base_url' => 'https://generativelanguage.googleapis.com/v1beta/models',
                    'models' => "gemini-2.5-flash\ngemini-2.5-pro",
                ],
            ],
        ];
    }

    private function __construct() {
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_post_merkaz_ai_export_logs', [$this, 'export_logs']);
        add_action('merkaz_ai_gateway_cleanup_logs', [$this, 'cleanup_logs']);

        if (!wp_next_scheduled('merkaz_ai_gateway_cleanup_logs')) {
            wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', 'merkaz_ai_gateway_cleanup_logs');
        }
    }

    public function admin_menu() {
        add_options_page('Merkaz AI Gateway', 'Merkaz AI Gateway', 'manage_options', 'merkaz-ai-gateway', [$this, 'render_settings_page']);
    }

    public function register_settings() {
        register_setting('merkaz_ai_gateway', $this->option_name, [$this, 'sanitize_options']);
    }

    public function get_options() {
        return wp_parse_args(get_option($this->option_name, []), self::default_options());
    }

    public function sanitize_options($input) {
        $defaults = self::default_options();
        $current = $this->get_options();
        $output = $defaults;

        $bools = ['enabled', 'allow_advanced_tab', 'allow_user_keys', 'allow_model_selection', 'allow_saved_keys'];
        foreach ($bools as $field) {
            $output[$field] = empty($input[$field]) ? 0 : 1;
        }

        $output['integration_key_id'] = sanitize_text_field($input['integration_key_id'] ?? $current['integration_key_id']);
        $output['shared_secret'] = sanitize_text_field($input['shared_secret'] ?? $current['shared_secret']);
        $output['allowed_clock_skew'] = max(30, intval($input['allowed_clock_skew'] ?? $current['allowed_clock_skew']));
        $output['daily_limit_total'] = max(1, intval($input['daily_limit_total'] ?? $current['daily_limit_total']));
        $output['daily_limit_per_user'] = max(1, intval($input['daily_limit_per_user'] ?? $current['daily_limit_per_user']));
        $output['cooldown_seconds'] = max(0, intval($input['cooldown_seconds'] ?? $current['cooldown_seconds']));
        $output['log_retention_days'] = max(1, intval($input['log_retention_days'] ?? $current['log_retention_days']));
        $output['default_modal_tab'] = in_array($input['default_modal_tab'] ?? '', ['basic', 'advanced'], true) ? $input['default_modal_tab'] : $current['default_modal_tab'];
        $output['default_provider_alias_label'] = sanitize_text_field($input['default_provider_alias_label'] ?? $current['default_provider_alias_label']);
        $output['default_provider_description'] = sanitize_textarea_field($input['default_provider_description'] ?? $current['default_provider_description']);
        $output['default_route_mode'] = in_array($input['default_route_mode'] ?? '', ['single', 'proposal_refine', 'multi_merge'], true) ? $input['default_route_mode'] : $current['default_route_mode'];
        foreach (['default_provider','default_model','review_provider','review_model','merge_provider','merge_model','default_audience','default_lesson_style'] as $field) {
            $output[$field] = sanitize_text_field($input[$field] ?? $current[$field]);
        }
        $output['default_duration'] = max(10, intval($input['default_duration'] ?? $current['default_duration']));
        foreach (['policy_note','help_note','status_note','quick_actions_note'] as $field) {
            $output[$field] = sanitize_textarea_field($input[$field] ?? $current[$field]);
        }
        $output['ui_config_json'] = $this->sanitize_json_textarea($input['ui_config_json'] ?? $current['ui_config_json'], $defaults['ui_config_json']);
        $output['prompt_templates_json'] = $this->sanitize_json_textarea($input['prompt_templates_json'] ?? $current['prompt_templates_json'], $defaults['prompt_templates_json']);

        $provider_input = $input['providers'] ?? [];
        foreach ($defaults['providers'] as $key => $provider_defaults) {
            $existing = is_array($current['providers'][$key] ?? null) ? $current['providers'][$key] : $provider_defaults;
            $submitted = is_array($provider_input[$key] ?? null) ? $provider_input[$key] : [];
            $new_api_key = array_key_exists('api_key', $submitted) ? trim((string) $submitted['api_key']) : '';
            $keep_existing = !empty($submitted['keep_existing_key']);
            $clear_key = !empty($submitted['clear_key']);
            if ($clear_key) {
                $api_key = '';
            } elseif ($new_api_key !== '') {
                $api_key = sanitize_text_field($new_api_key);
            } elseif ($keep_existing) {
                $api_key = (string) ($existing['api_key'] ?? '');
            } else {
                $api_key = (string) ($existing['api_key'] ?? '');
            }
            $output['providers'][$key] = [
                'label' => sanitize_text_field($submitted['label'] ?? $existing['label'] ?? $provider_defaults['label']),
                'api_key' => $api_key,
                'base_url' => esc_url_raw($submitted['base_url'] ?? $existing['base_url'] ?? $provider_defaults['base_url']),
                'models' => trim((string) ($submitted['models'] ?? $existing['models'] ?? $provider_defaults['models'])),
            ];
        }

        return $output;
    }

    private function sanitize_json_textarea($value, $fallback) {
        $raw = trim((string) $value);
        if ($raw === '') {
            return $fallback;
        }
        $decoded = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
            add_settings_error($this->option_name, md5($raw), 'One of the JSON text areas was invalid. The previous or default value was kept.');
            return $fallback;
        }
        return wp_json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    public function register_rest_routes() {
        register_rest_route('merkaz-ai/v1', '/bootstrap', [
            'methods' => 'POST',
            'callback' => [$this, 'rest_bootstrap'],
            'permission_callback' => [$this, 'verify_rest_request'],
        ]);
        register_rest_route('merkaz-ai/v1', '/lesson', [
            'methods' => 'POST',
            'callback' => [$this, 'rest_lesson'],
            'permission_callback' => [$this, 'verify_rest_request'],
        ]);
        register_rest_route('merkaz-ai/v1', '/logs', [
            'methods' => 'GET',
            'callback' => [$this, 'rest_logs'],
            'permission_callback' => function () { return current_user_can('manage_options'); },
        ]);
    }

    public function verify_rest_request(WP_REST_Request $request) {
        $options = $this->get_options();
        if (empty($options['enabled'])) {
            return new WP_Error('merkaz_ai_disabled', 'AI gateway is disabled.', ['status' => 403]);
        }
        $key_id = trim((string) $request->get_header('x-merkaz-key'));
        $timestamp = trim((string) $request->get_header('x-merkaz-timestamp'));
        $nonce = trim((string) $request->get_header('x-merkaz-nonce'));
        $signature = trim((string) $request->get_header('x-merkaz-signature'));
        $body = $request->get_body();
        if (!$key_id || !$timestamp || !$nonce || !$signature) {
            return new WP_Error('merkaz_ai_auth_missing', 'Missing authentication headers.', ['status' => 401]);
        }
        if (!hash_equals((string) $options['integration_key_id'], $key_id)) {
            return new WP_Error('merkaz_ai_auth_key', 'Invalid integration key.', ['status' => 401]);
        }
        $age = abs(time() - intval($timestamp));
        if ($age > intval($options['allowed_clock_skew'])) {
            return new WP_Error('merkaz_ai_auth_time', 'Request expired.', ['status' => 401]);
        }
        $expected = hash_hmac('sha256', $timestamp . '.' . $nonce . '.' . $body, (string) $options['shared_secret']);
        if (!hash_equals($expected, $signature)) {
            return new WP_Error('merkaz_ai_auth_signature', 'Invalid request signature.', ['status' => 401]);
        }
        $nonce_key = 'merkaz_ai_nonce_' . md5($key_id . '|' . $nonce);
        if (get_transient($nonce_key)) {
            return new WP_Error('merkaz_ai_auth_replay', 'Replay blocked.', ['status' => 401]);
        }
        set_transient($nonce_key, 1, max(60, intval($options['allowed_clock_skew'])));
        return true;
    }

    public function rest_bootstrap(WP_REST_Request $request) {
        $options = $this->get_options();
        $providers = [[
            'key' => 'default',
            'label' => $options['default_provider_alias_label'],
            'models' => [],
            'managedKeyAvailable' => true,
            'description' => $options['default_provider_description'],
            'advancedOnly' => false,
        ]];
        foreach ($options['providers'] as $key => $provider) {
            $providers[] = [
                'key' => $key,
                'label' => $provider['label'],
                'models' => $this->parse_models($provider['models']),
                'managedKeyAvailable' => !empty($provider['api_key']),
                'description' => '',
                'advancedOnly' => true,
            ];
        }
        return new WP_REST_Response([
            'enabled' => !empty($options['enabled']),
            'providers' => $providers,
            'defaults' => [
                'provider' => 'default',
                'model' => '',
                'duration' => intval($options['default_duration']),
                'audience' => $options['default_audience'],
                'lessonStyle' => $options['default_lesson_style'],
                'includeOriginal' => true,
                'includeTranslation' => true,
                'includeTransliteration' => false,
                'includeEducatorNotes' => true,
                'includeDiscussionPrompts' => true,
            ],
            'managedKeyPolicy' => [
                'cooldownSeconds' => intval($options['cooldown_seconds']),
                'dailyLimitTotal' => intval($options['daily_limit_total']),
                'dailyLimitPerUser' => intval($options['daily_limit_per_user']),
            ],
            'ui' => [
                'allowAdvancedTab' => !empty($options['allow_advanced_tab']),
                'defaultModalTab' => $options['default_modal_tab'],
                'policyNote' => $options['policy_note'],
                'helpNote' => $options['help_note'],
                'statusNote' => $options['status_note'],
                'quickActionsNote' => $options['quick_actions_note'],
                'allowUserKeys' => !empty($options['allow_user_keys']),
                'allowModelSelection' => !empty($options['allow_model_selection']),
                'allowSavedKeys' => !empty($options['allow_saved_keys']),
                'routeMode' => $options['default_route_mode'],
                'config' => json_decode($options['ui_config_json'], true) ?: [],
            ],
        ]);
    }

    public function rest_lesson(WP_REST_Request $request) {
        $start = microtime(true);
        $payload = $request->get_json_params();
        $options = $this->get_options();
        $integration_key = sanitize_text_field((string) $request->get_header('x-merkaz-key'));
        $user_hash = $this->hash_user_ref(sanitize_text_field($payload['userRef'] ?? 'anonymous'));
        $context_mode = sanitize_text_field($payload['contextMode'] ?? 'topic');
        $topic = sanitize_text_field($payload['topic'] ?? $payload['quickAction'] ?? '');
        $request_id = wp_generate_uuid4();
        $mode = 'basic';

        $rate_error = $this->check_rate_limits($integration_key, $user_hash, $options);
        if (is_wp_error($rate_error)) {
            $this->log_request(compact('request_id','integration_key','user_hash','context_mode','topic') + [
                'route' => 'lesson', 'mode' => $mode, 'provider' => 'default', 'model' => '', 'auth_mode' => 'managed', 'success' => 0,
                'status_code' => 429, 'latency_ms' => $this->elapsed_ms($start), 'error_message' => $rate_error->get_error_message(),
                'meta_json' => wp_json_encode(['code' => $rate_error->get_error_code()]),
            ]);
            return $rate_error;
        }

        $incoming_provider = sanitize_key($payload['provider'] ?? 'default');
        $manual_key = trim((string) ($payload['apiKey'] ?? ''));
        $is_advanced = ($incoming_provider !== 'default') || ($manual_key !== '') || !empty($payload['model']);
        $mode = $is_advanced ? 'advanced' : 'basic';

        $result = $this->resolve_execution_plan($payload, $options, $manual_key);
        if (is_wp_error($result)) {
            return $result;
        }

        if ($result['auth_mode'] === 'managed') {
            $cooldown_error = $this->check_managed_key_cooldown($integration_key, $user_hash, $options);
            if (is_wp_error($cooldown_error)) {
                $remaining = intval($cooldown_error->get_error_data()['retry_after'] ?? 0);
                return new WP_REST_Response([
                    'ok' => false,
                    'error' => 'cooldown',
                    'message' => $cooldown_error->get_error_message(),
                    'retry_after' => $remaining,
                ], 429);
            }
        }

        $response = $this->execute_plan($result, $payload, $options);
        if (is_wp_error($response)) {
            $this->log_request(compact('request_id','integration_key','user_hash','context_mode','topic','mode') + [
                'route' => 'lesson', 'provider' => $result['display_provider'], 'model' => $result['display_model'], 'auth_mode' => $result['auth_mode'],
                'success' => 0, 'status_code' => intval($response->get_error_data()['status'] ?? 500), 'latency_ms' => $this->elapsed_ms($start),
                'error_message' => $response->get_error_message(), 'meta_json' => wp_json_encode(['route_mode' => $result['route_mode']]),
            ]);
            return $response;
        }

        if ($result['auth_mode'] === 'managed') {
            $this->mark_managed_key_cooldown($integration_key, $user_hash, $options);
        }

        $usage = $response['usage'];
        $this->log_request(compact('request_id','integration_key','user_hash','context_mode','topic','mode') + [
            'route' => 'lesson', 'provider' => $response['provider'], 'model' => $response['model'], 'auth_mode' => $result['auth_mode'],
            'success' => 1, 'status_code' => 200, 'latency_ms' => $this->elapsed_ms($start),
            'prompt_tokens' => intval($usage['prompt_tokens'] ?? 0), 'completion_tokens' => intval($usage['completion_tokens'] ?? 0), 'total_tokens' => intval($usage['total_tokens'] ?? 0),
            'meta_json' => wp_json_encode(['route_mode' => $result['route_mode'], 'warnings' => $response['warnings']]),
        ]);

        return new WP_REST_Response([
            'ok' => true,
            'requestId' => $request_id,
            'provider' => $response['provider'],
            'model' => $response['model'],
            'routeMode' => $result['route_mode'],
            'title' => $response['title'],
            'content' => $response['content'],
            'warnings' => $response['warnings'],
            'usage' => $usage,
        ]);
    }

    private function resolve_execution_plan($payload, $options, $manual_key) {
        $incoming_provider = sanitize_key($payload['provider'] ?? 'default');
        $incoming_model = sanitize_text_field($payload['model'] ?? '');
        if ($incoming_provider !== 'default' && !isset($options['providers'][$incoming_provider])) {
            return new WP_Error('merkaz_ai_provider', 'Unsupported provider.', ['status' => 400]);
        }
        if ($manual_key !== '' && empty($options['allow_user_keys'])) {
            return new WP_Error('merkaz_ai_user_keys', 'Request-level user keys are disabled.', ['status' => 400]);
        }

        if ($incoming_provider === 'default') {
            return [
                'route_mode' => $options['default_route_mode'],
                'provider' => $options['default_provider'],
                'model' => $options['default_model'],
                'display_provider' => $options['default_provider_alias_label'],
                'display_model' => $options['default_model'],
                'auth_mode' => $manual_key !== '' ? 'manual' : 'managed',
                'api_key' => $manual_key !== '' ? $manual_key : (string) ($options['providers'][$options['default_provider']]['api_key'] ?? ''),
            ];
        }

        $provider = $incoming_provider;
        $model = $incoming_model !== '' ? $incoming_model : (string) ($options['default_model']);
        $display_provider = $options['providers'][$provider]['label'] ?? $provider;
        return [
            'route_mode' => 'single',
            'provider' => $provider,
            'model' => $model,
            'display_provider' => $display_provider,
            'display_model' => $model,
            'auth_mode' => $manual_key !== '' ? 'manual' : 'managed',
            'api_key' => $manual_key !== '' ? $manual_key : (string) ($options['providers'][$provider]['api_key'] ?? ''),
        ];
    }

    private function execute_plan($plan, $payload, $options) {
        if (empty($plan['api_key'])) {
            return new WP_Error('merkaz_ai_key_missing', 'No API key is available for this request.', ['status' => 400]);
        }
        switch ($plan['route_mode']) {
            case 'proposal_refine':
                return $this->run_proposal_refine($plan, $payload, $options);
            case 'multi_merge':
                return $this->run_multi_merge($plan, $payload, $options);
            default:
                return $this->run_single($plan['provider'], $plan['model'], $plan['api_key'], $this->build_prompt('lesson', $payload, $options), $options, $plan['display_provider']);
        }
    }

    private function run_single($provider, $model, $api_key, $prompt, $options, $display_provider = null) {
        $raw = $this->dispatch_provider_request($provider, $model, $api_key, $prompt, $options);
        if (is_wp_error($raw)) {
            return $raw;
        }
        $parsed = $this->parse_provider_output($provider, $raw['body']);
        return [
            'provider' => $display_provider ?: ($options['providers'][$provider]['label'] ?? $provider),
            'model' => $model,
            'title' => $parsed['title'],
            'content' => $parsed['content'],
            'warnings' => $parsed['warnings'],
            'usage' => $parsed['usage'],
        ];
    }

    private function run_proposal_refine($plan, $payload, $options) {
        $draft_response = $this->run_single($plan['provider'], $plan['model'], $plan['api_key'], $this->build_prompt('lesson', $payload, $options), $options, $plan['display_provider']);
        if (is_wp_error($draft_response)) {
            return $draft_response;
        }
        $review_provider = sanitize_key($options['review_provider']);
        $review_model = sanitize_text_field($options['review_model']);
        $review_key = $plan['auth_mode'] === 'manual' ? $plan['api_key'] : (string) ($options['providers'][$review_provider]['api_key'] ?? '');
        if (!$review_key) {
            return $draft_response;
        }
        $prompt = $this->build_prompt('refine', ['draft' => $draft_response['content']], $options);
        $final = $this->run_single($review_provider, $review_model, $review_key, $prompt, $options, $options['default_provider_alias_label']);
        return is_wp_error($final) ? $draft_response : $final;
    }

    private function run_multi_merge($plan, $payload, $options) {
        $responses = [];
        foreach (['openai', 'anthropic', 'google'] as $provider) {
            $key = $plan['auth_mode'] === 'manual' ? $plan['api_key'] : (string) ($options['providers'][$provider]['api_key'] ?? '');
            if (!$key) {
                continue;
            }
            $models = $this->parse_models($options['providers'][$provider]['models']);
            $model = $models[0] ?? $options['default_model'];
            $result = $this->run_single($provider, $model, $key, $this->build_prompt('lesson', $payload, $options), $options, $options['providers'][$provider]['label'] ?? $provider);
            if (!is_wp_error($result)) {
                $responses[] = "Provider: {$result['provider']}\nModel: {$result['model']}\nTitle: {$result['title']}\n{$result['content']}";
            }
        }
        if (empty($responses)) {
            return new WP_Error('merkaz_ai_merge_empty', 'No providers were available for the default merge route.', ['status' => 400]);
        }
        $merge_provider = sanitize_key($options['merge_provider']);
        $merge_model = sanitize_text_field($options['merge_model']);
        $merge_key = $plan['auth_mode'] === 'manual' ? $plan['api_key'] : (string) ($options['providers'][$merge_provider]['api_key'] ?? '');
        if (!$merge_key) {
            return new WP_Error('merkaz_ai_merge_key', 'The merge provider is not configured.', ['status' => 400]);
        }
        $prompt = $this->build_prompt('merge', ['responses' => implode("\n\n---\n\n", $responses)], $options);
        return $this->run_single($merge_provider, $merge_model, $merge_key, $prompt, $options, $options['default_provider_alias_label']);
    }

    private function build_prompt($template_name, $payload, $options) {
        $templates = json_decode($options['prompt_templates_json'], true);
        $template = is_array($templates) && !empty($templates[$template_name]) ? $templates[$template_name] : '';
        if (!$template) {
            return '';
        }
        $map = [
            '{{context_mode}}' => sanitize_text_field($payload['contextMode'] ?? 'topic'),
            '{{topic}}' => sanitize_text_field($payload['topic'] ?? ''),
            '{{audience}}' => sanitize_text_field($payload['audience'] ?? $options['default_audience']),
            '{{duration}}' => intval($payload['duration'] ?? $options['default_duration']),
            '{{lesson_style}}' => sanitize_text_field($payload['lessonStyle'] ?? $options['default_lesson_style']),
            '{{include_original}}' => !empty($payload['includeOriginal']) ? 'yes' : 'no',
            '{{include_translation}}' => !empty($payload['includeTranslation']) ? 'yes' : 'no',
            '{{include_transliteration}}' => !empty($payload['includeTransliteration']) ? 'yes' : 'no',
            '{{include_educator_notes}}' => !empty($payload['includeEducatorNotes']) ? 'yes' : 'no',
            '{{include_discussion_prompts}}' => !empty($payload['includeDiscussionPrompts']) ? 'yes' : 'no',
            '{{additional_instructions}}' => sanitize_textarea_field($payload['additionalInstructions'] ?? ''),
            '{{draft}}' => sanitize_textarea_field($payload['draft'] ?? ''),
            '{{responses}}' => sanitize_textarea_field($payload['responses'] ?? ''),
        ];
        return strtr($template, $map);
    }

    private function dispatch_provider_request($provider, $model, $api_key, $prompt, $options) {
        switch ($provider) {
            case 'openai': return $this->call_openai($model, $api_key, $prompt, $options);
            case 'anthropic': return $this->call_anthropic($model, $api_key, $prompt, $options);
            case 'google': return $this->call_google($model, $api_key, $prompt, $options);
            default: return new WP_Error('merkaz_ai_provider', 'Unsupported provider.', ['status' => 400]);
        }
    }

    private function call_openai($model, $api_key, $prompt, $options) {
        $url = $options['providers']['openai']['base_url'];
        $body = [
            'model' => $model,
            'input' => $prompt,
            'text' => ['format' => ['type' => 'json_schema', 'name' => 'lesson_draft', 'schema' => [
                'type' => 'object',
                'properties' => [
                    'title' => ['type' => 'string'],
                    'content' => ['type' => 'string'],
                    'warnings' => ['type' => 'array', 'items' => ['type' => 'string']],
                ],
                'required' => ['title', 'content', 'warnings'],
                'additionalProperties' => false,
            ]]],
        ];
        return $this->http_post_json($url, ['Authorization' => 'Bearer ' . $api_key], $body);
    }

    private function call_anthropic($model, $api_key, $prompt, $options) {
        $url = $options['providers']['anthropic']['base_url'];
        $body = [
            'model' => $model,
            'max_tokens' => 2500,
            'system' => 'Return JSON only with keys title, content, warnings.',
            'messages' => [['role' => 'user', 'content' => $prompt]],
        ];
        return $this->http_post_json($url, ['x-api-key' => $api_key, 'anthropic-version' => '2023-06-01'], $body);
    }

    private function call_google($model, $api_key, $prompt, $options) {
        $base = trailingslashit($options['providers']['google']['base_url']);
        $url = $base . rawurlencode($model) . ':generateContent?key=' . rawurlencode($api_key);
        $body = [
            'contents' => [[
                'parts' => [
                    ['text' => 'Return JSON only with keys title, content, warnings.'],
                    ['text' => $prompt],
                ],
            ]],
            'generationConfig' => ['responseMimeType' => 'application/json'],
        ];
        return $this->http_post_json($url, [], $body);
    }

    private function http_post_json($url, $headers, $body) {
        $response = wp_remote_post($url, [
            'timeout' => 90,
            'headers' => array_merge(['Content-Type' => 'application/json'], $headers),
            'body' => wp_json_encode($body),
        ]);
        if (is_wp_error($response)) {
            return new WP_Error('merkaz_ai_http', $response->get_error_message(), ['status' => 502]);
        }
        $status = wp_remote_retrieve_response_code($response);
        $raw_body = wp_remote_retrieve_body($response);
        if ($status < 200 || $status >= 300) {
            return new WP_Error('merkaz_ai_upstream', 'Upstream provider error.', ['status' => 502, 'body' => $raw_body, 'provider_status' => $status]);
        }
        return ['status' => $status, 'body' => $raw_body];
    }

    private function parse_provider_output($provider, $body) {
        $decoded = json_decode($body, true);
        $json_text = '';
        $usage = ['prompt_tokens' => 0, 'completion_tokens' => 0, 'total_tokens' => 0];
        if ($provider === 'openai') {
            $usage = [
                'prompt_tokens' => intval($decoded['usage']['input_tokens'] ?? 0),
                'completion_tokens' => intval($decoded['usage']['output_tokens'] ?? 0),
                'total_tokens' => intval($decoded['usage']['total_tokens'] ?? 0),
            ];
            if (!empty($decoded['output'][0]['content'][0]['text'])) {
                $json_text = (string) $decoded['output'][0]['content'][0]['text'];
            }
        } elseif ($provider === 'anthropic') {
            $usage = [
                'prompt_tokens' => intval($decoded['usage']['input_tokens'] ?? 0),
                'completion_tokens' => intval($decoded['usage']['output_tokens'] ?? 0),
                'total_tokens' => intval(($decoded['usage']['input_tokens'] ?? 0) + ($decoded['usage']['output_tokens'] ?? 0)),
            ];
            if (!empty($decoded['content'][0]['text'])) {
                $json_text = (string) $decoded['content'][0]['text'];
            }
        } elseif ($provider === 'google') {
            if (!empty($decoded['candidates'][0]['content']['parts'][0]['text'])) {
                $json_text = (string) $decoded['candidates'][0]['content']['parts'][0]['text'];
            }
        }
        $parsed = json_decode(trim($json_text), true);
        if (!is_array($parsed)) {
            $parsed = ['title' => 'AI Lesson Draft', 'content' => trim($json_text), 'warnings' => ['Provider did not return the expected JSON structure.']];
        }
        return [
            'title' => sanitize_text_field($parsed['title'] ?? 'AI Lesson Draft'),
            'content' => (string) ($parsed['content'] ?? ''),
            'warnings' => array_values(array_filter(array_map('strval', $parsed['warnings'] ?? []))),
            'usage' => $usage,
        ];
    }

    private function parse_models($raw_models) {
        $lines = preg_split('/\r\n|\r|\n/', (string) $raw_models);
        return array_values(array_filter(array_map('trim', $lines)));
    }

    private function hash_user_ref($user_ref) {
        return hash('sha256', strtolower(trim((string) $user_ref)));
    }

    private function check_rate_limits($integration_key, $user_hash, $options) {
        global $wpdb;
        $table = $wpdb->prefix . MERKAZ_AI_GATEWAY_LOG_TABLE;
        $today_start = gmdate('Y-m-d 00:00:00');
        $total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE integration_key = %s AND created_at >= %s", $integration_key, $today_start));
        if ($total >= intval($options['daily_limit_total'])) {
            return new WP_Error('merkaz_ai_rate_total', 'Daily gateway limit reached.', ['status' => 429]);
        }
        $user_total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE integration_key = %s AND user_hash = %s AND created_at >= %s", $integration_key, $user_hash, $today_start));
        if ($user_total >= intval($options['daily_limit_per_user'])) {
            return new WP_Error('merkaz_ai_rate_user', 'This user has reached the daily request limit.', ['status' => 429]);
        }
        return true;
    }

    private function cooldown_cache_key($integration_key, $user_hash) {
        return 'merkaz_ai_cd_' . md5($integration_key . '|' . $user_hash);
    }

    private function check_managed_key_cooldown($integration_key, $user_hash, $options) {
        $cooldown = intval($options['cooldown_seconds']);
        if ($cooldown <= 0) {
            return true;
        }
        $key = $this->cooldown_cache_key($integration_key, $user_hash);
        $last_used = (int) get_transient($key);
        if ($last_used && (time() - $last_used) < $cooldown) {
            $remaining = $cooldown - (time() - $last_used);
            return new WP_Error('merkaz_ai_cooldown', 'Please wait before using the site-managed route again.', ['status' => 429, 'retry_after' => $remaining]);
        }
        return true;
    }

    private function mark_managed_key_cooldown($integration_key, $user_hash, $options) {
        $cooldown = intval($options['cooldown_seconds']);
        if ($cooldown > 0) {
            set_transient($this->cooldown_cache_key($integration_key, $user_hash), time(), $cooldown);
        }
    }

    private function elapsed_ms($start) {
        return (int) round((microtime(true) - $start) * 1000);
    }

    private function log_request($data) {
        global $wpdb;
        $table = $wpdb->prefix . MERKAZ_AI_GATEWAY_LOG_TABLE;
        $wpdb->insert($table, [
            'created_at' => gmdate('Y-m-d H:i:s'),
            'route' => $data['route'] ?? '',
            'mode' => $data['mode'] ?? '',
            'provider' => $data['provider'] ?? '',
            'model' => $data['model'] ?? '',
            'auth_mode' => $data['auth_mode'] ?? '',
            'integration_key' => $data['integration_key'] ?? '',
            'user_hash' => $data['user_hash'] ?? '',
            'request_id' => $data['request_id'] ?? '',
            'context_mode' => $data['context_mode'] ?? '',
            'topic' => $data['topic'] ?? '',
            'success' => intval($data['success'] ?? 0),
            'status_code' => intval($data['status_code'] ?? 0),
            'latency_ms' => intval($data['latency_ms'] ?? 0),
            'prompt_tokens' => intval($data['prompt_tokens'] ?? 0),
            'completion_tokens' => intval($data['completion_tokens'] ?? 0),
            'total_tokens' => intval($data['total_tokens'] ?? 0),
            'error_message' => $data['error_message'] ?? '',
            'meta_json' => $data['meta_json'] ?? '',
        ]);
    }

    public function rest_logs(WP_REST_Request $request) {
        global $wpdb;
        $table = $wpdb->prefix . MERKAZ_AI_GATEWAY_LOG_TABLE;
        $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY created_at DESC LIMIT 100", ARRAY_A);
        return new WP_REST_Response($rows);
    }

    public function cleanup_logs() {
        global $wpdb;
        $options = $this->get_options();
        $table = $wpdb->prefix . MERKAZ_AI_GATEWAY_LOG_TABLE;
        $cutoff = gmdate('Y-m-d H:i:s', time() - DAY_IN_SECONDS * max(1, intval($options['log_retention_days'])));
        $wpdb->query($wpdb->prepare("DELETE FROM {$table} WHERE created_at < %s", $cutoff));
    }

    public function export_logs() {
        if (!current_user_can('manage_options')) {
            wp_die('Not allowed.');
        }
        global $wpdb;
        $table = $wpdb->prefix . MERKAZ_AI_GATEWAY_LOG_TABLE;
        $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY created_at DESC LIMIT 5000", ARRAY_A);
        nocache_headers();
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=merkaz-ai-gateway-logs.csv');
        $out = fopen('php://output', 'w');
        if (!empty($rows)) {
            fputcsv($out, array_keys($rows[0]));
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
        }
        fclose($out);
        exit;
    }

    public function render_settings_page() {
        $options = $this->get_options();
        global $wpdb;
        $table = $wpdb->prefix . MERKAZ_AI_GATEWAY_LOG_TABLE;
        $recent_logs = $wpdb->get_results("SELECT * FROM {$table} ORDER BY created_at DESC LIMIT 20", ARRAY_A);
        ?>
        <div class="wrap">
            <h1>Merkaz AI Gateway</h1>
            <p>Configure the Merkaz-managed AI route, advanced overrides, cooldowns, dynamic UI copy, and logging for the Google Docs add-on.</p>
            <?php settings_errors($this->option_name); ?>
            <form method="post" action="options.php">
                <?php settings_fields('merkaz_ai_gateway'); ?>
                <h2>Gateway</h2>
                <table class="form-table" role="presentation">
                    <tr><th>Enable Gateway</th><td><label><input type="checkbox" name="<?php echo esc_attr($this->option_name); ?>[enabled]" value="1" <?php checked(!empty($options['enabled'])); ?>> Accept requests from the add-on</label></td></tr>
                    <tr><th>Integration Key ID</th><td><input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[integration_key_id]" value="<?php echo esc_attr($options['integration_key_id']); ?>"></td></tr>
                    <tr><th>Shared Secret</th><td><input class="regular-text code" type="text" name="<?php echo esc_attr($this->option_name); ?>[shared_secret]" value="<?php echo esc_attr($options['shared_secret']); ?>"><p class="description">Put the same value in Apps Script Script Properties. Never place it in client-side HTML.</p></td></tr>
                    <tr><th>Allowed Clock Skew</th><td><input type="number" min="30" step="30" name="<?php echo esc_attr($this->option_name); ?>[allowed_clock_skew]" value="<?php echo esc_attr($options['allowed_clock_skew']); ?>"> seconds</td></tr>
                    <tr><th>Daily Limit Total</th><td><input type="number" min="1" step="1" name="<?php echo esc_attr($this->option_name); ?>[daily_limit_total]" value="<?php echo esc_attr($options['daily_limit_total']); ?>"></td></tr>
                    <tr><th>Daily Limit Per User</th><td><input type="number" min="1" step="1" name="<?php echo esc_attr($this->option_name); ?>[daily_limit_per_user]" value="<?php echo esc_attr($options['daily_limit_per_user']); ?>"></td></tr>
                    <tr><th>Cooldown</th><td><input type="number" min="0" step="30" name="<?php echo esc_attr($this->option_name); ?>[cooldown_seconds]" value="<?php echo esc_attr($options['cooldown_seconds']); ?>"> seconds<p class="description">This is enforced server-side and sent dynamically to the add-on.</p></td></tr>
                    <tr><th>Log Retention</th><td><input type="number" min="1" step="1" name="<?php echo esc_attr($this->option_name); ?>[log_retention_days]" value="<?php echo esc_attr($options['log_retention_days']); ?>"> days</td></tr>
                </table>

                <h2>Default Route</h2>
                <table class="form-table" role="presentation">
                    <tr><th>Alias Label</th><td><input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[default_provider_alias_label]" value="<?php echo esc_attr($options['default_provider_alias_label']); ?>"></td></tr>
                    <tr><th>Description</th><td><textarea class="large-text" rows="3" name="<?php echo esc_attr($this->option_name); ?>[default_provider_description]"><?php echo esc_textarea($options['default_provider_description']); ?></textarea></td></tr>
                    <tr><th>Default Route Mode</th><td><select name="<?php echo esc_attr($this->option_name); ?>[default_route_mode]"><option value="single" <?php selected($options['default_route_mode'], 'single'); ?>>single</option><option value="proposal_refine" <?php selected($options['default_route_mode'], 'proposal_refine'); ?>>proposal_refine</option><option value="multi_merge" <?php selected($options['default_route_mode'], 'multi_merge'); ?>>multi_merge</option></select></td></tr>
                    <tr><th>Primary Provider / Model</th><td><input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[default_provider]" value="<?php echo esc_attr($options['default_provider']); ?>"> <input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[default_model]" value="<?php echo esc_attr($options['default_model']); ?>"></td></tr>
                    <tr><th>Review Provider / Model</th><td><input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[review_provider]" value="<?php echo esc_attr($options['review_provider']); ?>"> <input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[review_model]" value="<?php echo esc_attr($options['review_model']); ?>"></td></tr>
                    <tr><th>Merge Provider / Model</th><td><input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[merge_provider]" value="<?php echo esc_attr($options['merge_provider']); ?>"> <input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[merge_model]" value="<?php echo esc_attr($options['merge_model']); ?>"></td></tr>
                    <tr><th>Default Duration</th><td><input type="number" min="10" step="5" name="<?php echo esc_attr($this->option_name); ?>[default_duration]" value="<?php echo esc_attr($options['default_duration']); ?>"></td></tr>
                    <tr><th>Default Audience</th><td><input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[default_audience]" value="<?php echo esc_attr($options['default_audience']); ?>"></td></tr>
                    <tr><th>Default Lesson Style</th><td><input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[default_lesson_style]" value="<?php echo esc_attr($options['default_lesson_style']); ?>"></td></tr>
                </table>

                <h2>Add-on UI Behavior</h2>
                <table class="form-table" role="presentation">
                    <tr><th>Allow Advanced Tab</th><td><label><input type="checkbox" name="<?php echo esc_attr($this->option_name); ?>[allow_advanced_tab]" value="1" <?php checked(!empty($options['allow_advanced_tab'])); ?>> Show Advanced tab</label></td></tr>
                    <tr><th>Default Tab</th><td><select name="<?php echo esc_attr($this->option_name); ?>[default_modal_tab]"><option value="basic" <?php selected($options['default_modal_tab'], 'basic'); ?>>Basic</option><option value="advanced" <?php selected($options['default_modal_tab'], 'advanced'); ?>>Advanced</option></select></td></tr>
                    <tr><th>Allow User Keys</th><td><label><input type="checkbox" name="<?php echo esc_attr($this->option_name); ?>[allow_user_keys]" value="1" <?php checked(!empty($options['allow_user_keys'])); ?>> Allow request-level pasted keys in Advanced</label></td></tr>
                    <tr><th>Allow Model Selection</th><td><label><input type="checkbox" name="<?php echo esc_attr($this->option_name); ?>[allow_model_selection]" value="1" <?php checked(!empty($options['allow_model_selection'])); ?>> Let Advanced choose a model</label></td></tr>
                    <tr><th>Allow Saved Keys</th><td><label><input type="checkbox" name="<?php echo esc_attr($this->option_name); ?>[allow_saved_keys]" value="1" <?php checked(!empty($options['allow_saved_keys'])); ?>> Show the saved-key option in Advanced</label></td></tr>
                    <tr><th>Policy Note</th><td><textarea class="large-text" rows="3" name="<?php echo esc_attr($this->option_name); ?>[policy_note]"><?php echo esc_textarea($options['policy_note']); ?></textarea></td></tr>
                    <tr><th>Help Note</th><td><textarea class="large-text" rows="3" name="<?php echo esc_attr($this->option_name); ?>[help_note]"><?php echo esc_textarea($options['help_note']); ?></textarea></td></tr>
                    <tr><th>Status Note</th><td><textarea class="large-text" rows="2" name="<?php echo esc_attr($this->option_name); ?>[status_note]"><?php echo esc_textarea($options['status_note']); ?></textarea></td></tr>
                    <tr><th>Quick Actions Note</th><td><textarea class="large-text" rows="2" name="<?php echo esc_attr($this->option_name); ?>[quick_actions_note]"><?php echo esc_textarea($options['quick_actions_note']); ?></textarea></td></tr>
                    <tr><th>UI Config JSON</th><td><textarea class="large-text code" rows="12" name="<?php echo esc_attr($this->option_name); ?>[ui_config_json]"><?php echo esc_textarea($options['ui_config_json']); ?></textarea></td></tr>
                    <tr><th>Prompt Templates JSON</th><td><textarea class="large-text code" rows="16" name="<?php echo esc_attr($this->option_name); ?>[prompt_templates_json]"><?php echo esc_textarea($options['prompt_templates_json']); ?></textarea></td></tr>
                </table>

                <h2>Provider Credentials</h2>
                <table class="widefat striped" style="max-width:1200px;">
                    <thead><tr><th>Provider</th><th>Current Key</th><th>Paste New Key</th><th>Keep Existing</th><th>Clear</th><th>Base URL</th><th>Allowed Models</th></tr></thead>
                    <tbody>
                    <?php foreach ($options['providers'] as $key => $provider) : ?>
                        <tr>
                            <td><input class="regular-text" type="text" name="<?php echo esc_attr($this->option_name); ?>[providers][<?php echo esc_attr($key); ?>][label]" value="<?php echo esc_attr($provider['label']); ?>"></td>
                            <td><?php echo !empty($provider['api_key']) ? 'Stored' : 'Not set'; ?></td>
                            <td><input class="regular-text code" type="password" name="<?php echo esc_attr($this->option_name); ?>[providers][<?php echo esc_attr($key); ?>][api_key]" value=""></td>
                            <td><label><input type="checkbox" name="<?php echo esc_attr($this->option_name); ?>[providers][<?php echo esc_attr($key); ?>][keep_existing_key]" value="1" checked> keep</label></td>
                            <td><label><input type="checkbox" name="<?php echo esc_attr($this->option_name); ?>[providers][<?php echo esc_attr($key); ?>][clear_key]" value="1"> clear</label></td>
                            <td><input class="large-text code" type="text" name="<?php echo esc_attr($this->option_name); ?>[providers][<?php echo esc_attr($key); ?>][base_url]" value="<?php echo esc_attr($provider['base_url']); ?>"></td>
                            <td><textarea class="large-text code" rows="5" name="<?php echo esc_attr($this->option_name); ?>[providers][<?php echo esc_attr($key); ?>][models]"><?php echo esc_textarea($provider['models']); ?></textarea></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
                <?php submit_button('Save Gateway Settings'); ?>
            </form>

            <h2>Recent Logs</h2>
            <p><a class="button" href="<?php echo esc_url(admin_url('admin-post.php?action=merkaz_ai_export_logs')); ?>">Export CSV</a></p>
            <table class="widefat striped">
                <thead><tr><th>Created</th><th>Mode</th><th>Provider</th><th>Model</th><th>Status</th><th>Latency</th><th>User Hash</th><th>Topic</th></tr></thead>
                <tbody>
                <?php if (empty($recent_logs)) : ?>
                    <tr><td colspan="8">No logs yet.</td></tr>
                <?php else : foreach ($recent_logs as $row) : ?>
                    <tr>
                        <td><?php echo esc_html($row['created_at']); ?></td>
                        <td><?php echo esc_html($row['mode']); ?></td>
                        <td><?php echo esc_html($row['provider']); ?></td>
                        <td><?php echo esc_html($row['model']); ?></td>
                        <td><?php echo esc_html($row['status_code']); ?></td>
                        <td><?php echo esc_html($row['latency_ms']); ?> ms</td>
                        <td><code><?php echo esc_html(substr($row['user_hash'], 0, 16)); ?></code></td>
                        <td><?php echo esc_html($row['topic']); ?></td>
                    </tr>
                <?php endforeach; endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }
}
