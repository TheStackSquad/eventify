import { calculateServiceFee } from "@/utils/currency";

export const calculateCartTotals = (cartItems) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return {
      subtotal: 0,
      serviceFee: 0,
      vat: 0,
      totalFees: 0,
      finalTotal: 0,
      finalTotalKobo: 0,
      itemsBreakdown: [],
      hasMixedTiers: false,
      itemCount: 0,
    };
  }

  let totalSubtotal = 0;
  let totalServiceFee = 0;
  let totalVAT = 0;
  const itemsBreakdown = [];
  const tiers = new Set();

  cartItems.forEach((item) => {
    const pricePerTicket = Number(item.price);
    const itemQuantity = item.quantity || 1;
    const itemSubtotal = pricePerTicket * itemQuantity;

    const feeCalc = calculateServiceFee(pricePerTicket);
    const itemServiceFee = feeCalc.serviceFee * itemQuantity;
    const itemVAT = feeCalc.vat * itemQuantity;

    tiers.add(feeCalc.tier);

    totalSubtotal += itemSubtotal;
    totalServiceFee += itemServiceFee;
    totalVAT += itemVAT;

    itemsBreakdown.push({
      cartId: item.cartId || item.id,
      eventTitle: item.eventTitle,
      tierName: item.tierName,
      pricePerTicket: pricePerTicket,
      quantity: itemQuantity,
      subtotal: itemSubtotal,
      serviceFee: itemServiceFee,
      vat: itemVAT,
      totalFees: itemServiceFee + itemVAT,
      tier: feeCalc.tier,
    });
  });

  const totalFees = totalServiceFee + totalVAT;
  const finalTotal = totalSubtotal + totalFees;
  const finalTotalKobo = Math.round(finalTotal * 100);

  return {
    subtotal: totalSubtotal,
    serviceFee: totalServiceFee,
    vat: totalVAT,
    totalFees: totalFees,
    finalTotal: finalTotal,
    finalTotalKobo: finalTotalKobo,
    itemsBreakdown: itemsBreakdown,
    hasMixedTiers: tiers.size > 1,
    itemCount: cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
  };
};

export const formatOrderMetadata = (cartTotals, customerInfo, cartItems) => {
  return {
    customer_info: {
      firstName: customerInfo.firstName,
      lastName: customerInfo.lastName,
      email: customerInfo.email,
      phone: customerInfo.phone,
      city: customerInfo.city,
      state: customerInfo.state,
      country: customerInfo.country,
    },
    order_breakdown: {
      subtotal: cartTotals.subtotal,
      service_fee: cartTotals.serviceFee,
      vat_amount: cartTotals.vat,
      total_fees: cartTotals.totalFees,
      final_total: cartTotals.finalTotal,
      item_count: cartTotals.itemCount,
      has_mixed_tiers: cartTotals.hasMixedTiers,
    },
    items: cartTotals.itemsBreakdown.map((item, index) => ({
      event_title: item.eventTitle,
      tier_name: item.tierName,
      price_per_ticket: item.pricePerTicket,
      quantity: item.quantity,
      subtotal: item.subtotal,
      service_fee: item.serviceFee,
      vat: item.vat,
      tier: item.tier,
      ...cartItems[index],
    })),
  };
};
