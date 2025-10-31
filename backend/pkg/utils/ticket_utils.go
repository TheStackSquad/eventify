//backend/pkg/utils/ticket_utils.go

package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

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

// Format: TIX_[Timestamp]_[Random_Suffix]
func GenerateUniqueTransactionReference() string {
	// 1. Get current Unix Milliseconds
	timestamp := time.Now().UnixMilli() 

	// 2. Generate secure random suffix (e.g., 6 bytes -> 12 hex characters)
	randomBytes := make([]byte, 6) 
	if _, err := rand.Read(randomBytes); err != nil {
		// Secure fallback using Nano-timestamp if true randomness fails
		randomBytes = []byte(fmt.Sprintf("%d", time.Now().UnixNano())) 
	}
	// Use the last 8 characters of the hex string for brevity
	secureSuffix := hex.EncodeToString(randomBytes)
	if len(secureSuffix) > 8 {
		secureSuffix = secureSuffix[len(secureSuffix)-8:]
	}

	// 3. Combine components
	// Example: TIX_1678886400000_A1B2C3D4
	return fmt.Sprintf("TIX_%d_%s", timestamp, secureSuffix)
}