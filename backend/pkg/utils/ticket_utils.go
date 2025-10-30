//backend/pkg/utils/ticket_utils.go

package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

// GenerateUniqueTicketCode generates a unique alphanumeric code for a single ticket.
// It combines the transaction reference prefix with a secure random string for uniqueness.
//
// Parameters:
// - baseRef: The Paystack transaction reference (e.g., TIX_1761813148409_VL9IHU2M9)
// - index: The numerical index of the ticket within the order (0, 1, 2, ...)
//
// Format: [Ref_Prefix]-[Index]-[Secure_Random_Suffix] e.g., TIX-001-A2B4C6D8
func GenerateUniqueTicketCode(baseRef string, index int) string {
	// 1. Get the primary reference prefix (e.g., "TIX" or the first few chars of the full ref)
	// We'll use the Paystack reference as the base, but ensure the resulting code is short.
	
	// Use the last 9 characters of the unique Paystack reference (TIX_..._VL9IHU2M9)
	refSuffix := baseRef
	if len(baseRef) > 9 {
		refSuffix = baseRef[len(baseRef)-9:]
	}

	// 2. Generate a secure random suffix (e.g., 4 bytes -> 8 hex characters)
	randomBytes := make([]byte, 4) 
	if _, err := rand.Read(randomBytes); err != nil {
		// Fallback or panic, but ideally use secure random data
		randomBytes = []byte{0, 0, 0, 0} // Using zero for a simple fallback
	}
	secureSuffix := hex.EncodeToString(randomBytes)

	// 3. Format the final code: [ReferenceSuffix]-[Index]-[SecureSuffix]
	// Example result: VL9IHU2M9-003-a4e7d8c1
	
	// Pad the index to 3 digits (e.g., 1 -> 001)
	paddedIndex := fmt.Sprintf("%03d", index+1) 

	return fmt.Sprintf("%s-%s-%s", refSuffix, paddedIndex, secureSuffix)
}

// NOTE: You would need to ensure this utility file is imported in your services/order_services.go 
// and that the main application logic is updated to use the appropriate package path.