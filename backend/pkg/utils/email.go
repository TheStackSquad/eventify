// backend/pkg/utils/email.go (Create this file)

package utils

import (
	"fmt"
	"net/smtp"
	"os"
)

func SendPasswordResetEmail(to, name, resetLink string) error {
	// Email configuration from environment
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	fromEmail := os.Getenv("FROM_EMAIL")
	
	if smtpHost == "" {
		return fmt.Errorf("SMTP not configured")
	}
	
	// Email content
	subject := "Password Reset Request - Eventify"
	body := fmt.Sprintf(`
		Hello %s,
		
		You requested to reset your password. Click the link below to reset it:
		
		%s
		
		This link will expire in 15 minutes.
		
		If you didn't request this, please ignore this email.
		
		Best regards,
		Eventify Team
	`, name, resetLink)
	
	message := []byte(fmt.Sprintf(
		"Subject: %s\r\n\r\n%s", 
		subject, 
		body,
	))
	
	// Send email
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	err := smtp.SendMail(
		smtpHost+":"+smtpPort,
		auth,
		fromEmail,
		[]string{to},
		message,
	)
	
	return err
}