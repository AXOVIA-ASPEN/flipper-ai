// Story 5.5: Shippo API integration for shipping cost estimation
// Retrieves USPS, UPS, and FedEx rate estimates for shippable items

import { Shippo } from 'shippo';

export interface ShippingEstimates {
  usps: number | null;
  ups: number | null;
  fedex: number | null;
  lowestCost: number;
  currency: 'USD';
}

let shippoClient: Shippo | null = null;

function getShippoClient(): Shippo {
  if (!shippoClient) {
    const token = process.env.SHIPPO_API_TOKEN;
    if (!token) {
      throw new Error('SHIPPO_API_TOKEN not set');
    }
    shippoClient = new Shippo({ apiKeyHeader: token });
  }
  return shippoClient;
}

export async function estimateShippingCosts(
  weightLbs: number,
  dimensions: { length: number; width: number; height: number },
  toZip: string
): Promise<ShippingEstimates | null> {
  // Gracefully return null if no token configured
  if (!process.env.SHIPPO_API_TOKEN) {
    console.warn('SHIPPO_API_TOKEN not set, skipping shipping cost estimation');
    return null;
  }

  try {
    const client = getShippoClient();
    const fromZip = process.env.SHIPPO_FROM_ZIP || '10001';

    // Create shipment to get rates
    const shipment = await client.shipments.create({
      addressFrom: {
        name: 'Flipper.ai',
        zip: fromZip,
        country: 'US',
      },
      addressTo: {
        name: 'Buyer',
        zip: toZip,
        country: 'US',
      },
      parcels: [
        {
          length: String(dimensions.length),
          width: String(dimensions.width),
          height: String(dimensions.height),
          distanceUnit: 'in',
          weight: String(weightLbs),
          massUnit: 'lb',
        },
      ],
    });

    // Extract rates by carrier
    const rates = shipment.rates ?? [];

    let usps: number | null = null;
    let ups: number | null = null;
    let fedex: number | null = null;

    for (const rate of rates) {
      const amount = parseFloat(rate.amount ?? '0');
      if (isNaN(amount) || amount <= 0) continue;

      const provider = (rate.provider ?? '').toLowerCase();
      if (provider.includes('usps') && (usps === null || amount < usps)) {
        usps = amount;
      } else if (provider.includes('ups') && (ups === null || amount < ups)) {
        ups = amount;
      } else if (provider.includes('fedex') && (fedex === null || amount < fedex)) {
        fedex = amount;
      }
    }

    // Calculate lowest cost from all non-null estimates
    const nonNullRates = [usps, ups, fedex].filter((r): r is number => r !== null);
    const lowestCost = nonNullRates.length > 0 ? Math.min(...nonNullRates) : 0;

    return { usps, ups, fedex, lowestCost, currency: 'USD' };
  } catch (error) {
    console.warn('Shippo API error, returning null:', error);
    return null;
  }
}
