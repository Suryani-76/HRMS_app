update auth.users set confirmation_token = '', recovery_token = '', email_change_token_new = '', email_change = '' where confirmation_token is null;
