# Marketplace Data Normalizers

## Mercari Normalizer

The Mercari Normalizer converts raw Mercari listing data into a standardized format for the Flipper AI platform.

### Features

- Normalize item condition to a standard enum
- Extract seller information
- Standardize listing metadata
- Brand detection from title and description

### Usage

```python
from marketplace_integrations.mercari_normalizer import MercariListingNormalizer

normalizer = MercariListingNormalizer()
normalized_listing = normalizer.normalize_listing(raw_mercari_listing)
```

### Normalization Steps

1. Condition Mapping
   - Maps Mercari's condition descriptions to a standard enum
   - Handles variations in condition descriptions

2. Seller Information Extraction
   - Pulls key seller metrics
   - Provides a consistent seller info structure

3. Listing Standardization
   - Extracts and normalizes key listing attributes
   - Ensures consistent data across different marketplaces

### Roadmap

- Expand brand detection dictionary
- Add more sophisticated brand/model extraction
- Improve condition mapping accuracy
