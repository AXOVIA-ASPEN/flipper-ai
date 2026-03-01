import unittest
from mercari_search import MercariSearch

class TestMercariSearch(unittest.TestCase):
    def setUp(self):
        self.mercari_search = MercariSearch()

    def test_basic_search(self):
        """
        Test basic search functionality
        """
        results = self.mercari_search.search(keywords="nintendo switch")
        
        self.assertIsInstance(results, list)
        self.assertTrue(len(results) > 0)
        
        # Check result structure
        for result in results:
            self.assertIn('id', result)
            self.assertIn('title', result)
            self.assertIn('price', result)
            self.assertIn('url', result)
            self.assertIn('is_sold', result)

    def test_advanced_filters(self):
        """
        Test search with advanced filters
        """
        results = self.mercari_search.search(
            keywords="nintendo switch",
            category="electronics",
            condition="like_new",
            min_price=100,
            max_price=300,
            include_sold=False
        )
        
        # Verify filtering
        for result in results:
            # Price range check
            self.assertTrue(100 <= result['price'] <= 300)
            
            # No sold items
            self.assertFalse(result['is_sold'])

    def test_no_results(self):
        """
        Test search with parameters that likely return no results
        """
        results = self.mercari_search.search(
            keywords="extremely_unlikely_search_term_that_wont_match",
            min_price=999999
        )
        
        # Ensure empty list is returned
        self.assertEqual(len(results), 0)

if __name__ == '__main__':
    unittest.main()