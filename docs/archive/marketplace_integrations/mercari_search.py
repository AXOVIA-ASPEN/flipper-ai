import requests
from typing import Optional, List, Dict
import logging

class MercariSearch:
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Mercari search with optional API key
        
        :param api_key: Optional Mercari API key for authenticated requests
        """
        self.base_url = "https://api.mercari.com/v2/search"
        self.api_key = api_key
        self.logger = logging.getLogger(__name__)
        logging.basicConfig(level=logging.INFO)

    def search(
        self, 
        keywords: str, 
        category: Optional[str] = None,
        condition: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        include_sold: bool = False
    ) -> List[Dict]:
        """
        Perform a search on Mercari with advanced filtering
        
        :param keywords: Search keywords
        :param category: Optional category filter
        :param condition: Optional item condition filter
        :param min_price: Minimum price filter
        :param max_price: Maximum price filter
        :param include_sold: Flag to include or exclude sold items
        :return: List of search results
        """
        # Construct query parameters
        params = {
            "keyword": keywords,
            "limit": 100  # Default to 100 results
        }

        # Add optional filters
        if category:
            params["category_id"] = category
        
        if condition:
            condition_map = {
                "new": "1",
                "like_new": "2",
                "good": "3",
                "fair": "4"
            }
            params["condition"] = condition_map.get(condition.lower(), condition)
        
        if min_price is not None:
            params["price_min"] = min_price
        
        if max_price is not None:
            params["price_max"] = max_price
        
        # Handle sold items flag
        if not include_sold:
            params["status"] = "on_sale"

        try:
            # Make the API request
            headers = {
                "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
                "Content-Type": "application/json"
            }
            
            response = requests.get(self.base_url, params=params, headers=headers)
            response.raise_for_status()
            
            results = response.json().get('items', [])
            
            # Transform results to standardized format
            processed_results = [
                {
                    "id": item.get('id'),
                    "title": item.get('name'),
                    "price": item.get('price'),
                    "condition": item.get('condition_description'),
                    "url": f"https://mercari.com/item/{item.get('id')}",
                    "is_sold": item.get('status') == "sold"
                } for item in results
            ]
            
            self.logger.info(f"Mercari search returned {len(processed_results)} results")
            return processed_results
        
        except requests.RequestException as e:
            self.logger.error(f"Mercari search error: {e}")
            return []

def main():
    """
    Example usage and testing
    """
    mercari_search = MercariSearch()
    
    # Example search with multiple filters
    results = mercari_search.search(
        keywords="nintendo switch",
        category="electronics",
        condition="like_new",
        min_price=100,
        max_price=300,
        include_sold=False
    )
    
    for result in results:
        print(result)

if __name__ == "__main__":
    main()