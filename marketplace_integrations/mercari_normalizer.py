from enum import Enum, auto
from typing import Dict, Any, Optional
import re

class StandardCondition(Enum):
    NEW = auto()
    LIKE_NEW = auto()
    VERY_GOOD = auto()
    GOOD = auto()
    ACCEPTABLE = auto()
    POOR = auto()

class MercariListingNormalizer:
    @staticmethod
    def normalize_condition(mercari_condition: str) -> StandardCondition:
        """
        Map Mercari's condition descriptions to standard condition enum
        
        Mercari condition categories:
        - Brand New/New
        - Like New
        - Very Good
        - Good
        - Acceptable
        - Poor/Has Flaws
        """
        condition_mapping = [
            (r'\blike new\b', StandardCondition.LIKE_NEW),
            (r'\bbrand new\b', StandardCondition.NEW),
            (r'\bnew\b', StandardCondition.NEW),
            (r'\bvery good\b', StandardCondition.VERY_GOOD),
            (r'\bgood\b', StandardCondition.GOOD),
            (r'\bacceptable\b', StandardCondition.ACCEPTABLE),
            (r'\bpoor\b|\bhas flaws\b', StandardCondition.POOR)
        ]
        
        normalized_condition = mercari_condition.lower()
        
        for pattern, condition in condition_mapping:
            if re.search(pattern, normalized_condition):
                return condition
        
        # Default to GOOD if no match found
        return StandardCondition.GOOD

    @staticmethod
    def extract_seller_info(listing_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant seller information
        
        :param listing_data: Raw Mercari listing data
        :return: Normalized seller information dictionary
        """
        return {
            'seller_name': listing_data.get('seller_username', 'Unknown'),
            'seller_rating': listing_data.get('seller_rating', None),
            'total_sales': listing_data.get('seller_total_sales', 0),
            'joined_date': listing_data.get('seller_join_date', None)
        }

    def normalize_listing(self, mercari_listing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize a Mercari listing to a standard format
        
        :param mercari_listing: Raw Mercari listing data
        :return: Normalized listing dictionary
        """
        return {
            'platform': 'Mercari',
            'platform_id': mercari_listing.get('id'),
            'title': mercari_listing.get('title', ''),
            'description': mercari_listing.get('description', ''),
            'price': float(mercari_listing.get('price', 0)),
            'images': mercari_listing.get('image_urls', []),
            'condition': self.normalize_condition(
                mercari_listing.get('condition', 'Unknown')
            ).name,
            'seller_info': self.extract_seller_info(mercari_listing),
            'category': mercari_listing.get('category', 'Unknown'),
            'brand': self._extract_brand(mercari_listing),
            'shipping_cost': float(mercari_listing.get('shipping_cost', 0)),
            'shipping_method': mercari_listing.get('shipping_method', 'Unknown'),
            'url': mercari_listing.get('listing_url')
        }

    def _extract_brand(self, listing_data: Dict[str, Any]) -> Optional[str]:
        """
        Extract brand from Mercari listing
        
        :param listing_data: Raw Mercari listing data
        :return: Extracted brand or None
        """
        # Try multiple ways to extract brand
        brand_candidates = [
            listing_data.get('brand'),
            self._find_brand_in_title(listing_data.get('title', '')),
            self._find_brand_in_description(listing_data.get('description', ''))
        ]
        
        # Return first non-None, non-empty brand
        return next((brand for brand in brand_candidates if brand), None)

    def _find_brand_in_title(self, title: str) -> Optional[str]:
        """
        Find brand in listing title
        
        :param title: Listing title
        :return: Extracted brand or None
        """
        # Add your brand detection logic here
        # This is a simple placeholder - you'd want a more sophisticated method
        brands = ['Nike', 'Adidas', 'Apple', 'Samsung', 'Sony']
        for brand in brands:
            if brand.lower() in title.lower():
                return brand
        return None

    def _find_brand_in_description(self, description: str) -> Optional[str]:
        """
        Find brand in listing description
        
        :param description: Listing description
        :return: Extracted brand or None
        """
        # Similar to title brand detection
        brands = ['Nike', 'Adidas', 'Apple', 'Samsung', 'Sony']
        for brand in brands:
            if brand.lower() in description.lower():
                return brand
        return None