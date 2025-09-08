// Generated script for workflow abf2315b-09a8-4385-9093-69420b8f4d7f
// Generated at 2025-09-08T14:33:43.942Z

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from 'zod';
import StagehandConfig from "./stagehand.config.js";

// Stagehand configuration

async function runWorkflow() {
  let stagehand: Stagehand | null = null;

  try {
    // Initialize Stagehand
    console.log('Initializing Stagehand...');
    stagehand = new Stagehand(StagehandConfig);
    await stagehand.init();
    console.log('Stagehand initialized successfully.');

    // Get the page instance
    const page = stagehand.page;
    if (!page) {
      throw new Error('Failed to get page instance from Stagehand');
    }

    // Step 1: Navigate to URL
    console.log('Navigating to: https://dev.to');
    await page.goto('https://dev.to');

    // Step 2: Navigate to URL
    console.log('Navigating to: https://dev.to');
    await page.goto('https://dev.to');

    // Step 3: Navigate to URL
    console.log('Navigating to: https://sarasota.craigslist.org/');
    await page.goto('https://sarasota.craigslist.org/');

    // Step 4: Perform action
    console.log(
      `Performing action: click the electronics link in the for sale section`,
    );
    await page.act({
      action: `click the electronics link in the for sale section`,
    });

    // Step 5: Extract data
    console.log(
      `Extracting: extract all visible electronics listings with their titles, prices, descriptions, posting times, and locations`,
    );
    const extractedData5 = await page.extract({
      instruction: `extract all visible electronics listings with their titles, prices, descriptions, posting times, and locations`,
      schema: z.object({
        listings: z.array(
          z.object({
            title: z.string().optional(),
            price: z.string().optional(),
            description: z.string().optional(),
            location: z.string().optional(),
            timePosted: z.string().optional(),
            imageUrl: z.string().optional(),
          }),
        ),
      }) as any,
    });
    console.log('Extracted:', extractedData5);

    // Step 6: Perform action
    console.log(`Performing action: click the Apple Watch 42mm listing`);
    await page.act({
      action: `click the Apple Watch 42mm listing`,
    });

    // Step 7: Extract data
    console.log(
      `Extracting: extract all details from this Apple Watch listing including title, price, condition, full description, location, post ID, and any contact information`,
    );
    const extractedData7 = await page.extract({
      instruction: `extract all details from this Apple Watch listing including title, price, condition, full description, location, post ID, and any contact information`,
      schema: z.object({
        title: z.string().optional(),
        price: z.string().optional(),
        condition: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        postId: z.string().optional(),
        images: z.array(z.string()).optional(),
        sellerContact: z.string().optional(),
        makeModel: z.string().optional(),
      }) as any,
    });
    console.log('Extracted:', extractedData7);

    // Step 8: Navigate back
    console.log('Navigating back to previous page');
    await page.goBack();
    await page.waitForTimeout(5000);

    // Step 9: Perform action
    console.log(`Performing action: click the iPad Air 2 listing`);
    await page.act({
      action: `click the iPad Air 2 listing`,
    });

    // Step 10: Extract data
    console.log(
      `Extracting: extract all details from this iPad Air 2 listing including title, price, condition, description, location, post ID, and specifications`,
    );
    const extractedData10 = await page.extract({
      instruction: `extract all details from this iPad Air 2 listing including title, price, condition, description, location, post ID, and specifications`,
      schema: z.object({
        title: z.string().optional(),
        price: z.string().optional(),
        condition: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        postId: z.string().optional(),
        makeModel: z.string().optional(),
        storage: z.string().optional(),
      }) as any,
    });
    console.log('Extracted:', extractedData10);

    // Step 11: Navigate back
    console.log('Navigating back to previous page');
    await page.goBack();
    await page.waitForTimeout(5000);

    // Step 12: Perform action
    console.log(`Performing action: click the Samsung 65" LED TV listing`);
    await page.act({
      action: `click the Samsung 65" LED TV listing`,
    });

    // Step 13: Extract data
    console.log(
      `Extracting: extract all details from this Samsung 65" TV listing including title, price, description, location, post ID, and specifications`,
    );
    const extractedData13 = await page.extract({
      instruction: `extract all details from this Samsung 65" TV listing including title, price, description, location, post ID, and specifications`,
      schema: z.object({
        title: z.string().optional(),
        price: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        postId: z.string().optional(),
        makeModel: z.string().optional(),
        size: z.string().optional(),
        age: z.string().optional(),
      }) as any,
    });
    console.log('Extracted:', extractedData13);

    // Step 14: Navigate back
    console.log('Navigating back to previous page');
    await page.goBack();
    await page.waitForTimeout(5000);

    // Step 15: Perform action
    console.log(`Performing action: click the Pioneer ddj-sb3 listing`);
    await page.act({
      action: `click the Pioneer ddj-sb3 listing`,
    });

    // Step 16: Extract data
    console.log(
      `Extracting: extract all details from this Pioneer DDJ-SB3 listing including title, price, description, location, post ID, and condition`,
    );
    const extractedData16 = await page.extract({
      instruction: `extract all details from this Pioneer DDJ-SB3 listing including title, price, description, location, post ID, and condition`,
      schema: z.object({
        title: z.string().optional(),
        price: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        postId: z.string().optional(),
        condition: z.string().optional(),
      }) as any,
    });
    console.log('Extracted:', extractedData16);

    // Step 17: Navigate back
    console.log('Navigating back to previous page');
    await page.goBack();
    await page.waitForTimeout(5000);

    // Step 18: Perform action
    console.log(
      `Performing action: click the New/Sealed Bose Soundlink Micro listing`,
    );
    await page.act({
      action: `click the New/Sealed Bose Soundlink Micro listing`,
    });

    // Step 19: Extract data
    console.log(
      `Extracting: extract all details from this Bose Soundlink Micro listing including title, price, description, location, post ID, condition, and seller information`,
    );
    const extractedData19 = await page.extract({
      instruction: `extract all details from this Bose Soundlink Micro listing including title, price, description, location, post ID, condition, and seller information`,
      schema: z.object({
        title: z.string().optional(),
        price: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        postId: z.string().optional(),
        condition: z.string().optional(),
        sellerName: z.string().optional(),
      }) as any,
    });
    console.log('Extracted:', extractedData19);

    // Step 20: Navigate back
    console.log('Navigating back to previous page');
    await page.goBack();
    await page.waitForTimeout(5000);

    // Step 21: Perform action
    console.log(
      `Performing action: click the Canon REALIS SX6 LCOS Projector listing`,
    );
    await page.act({
      action: `click the Canon REALIS SX6 LCOS Projector listing`,
    });

    // Step 22: Extract data
    console.log(
      `Extracting: extract all details from this Canon REALIS SX6 projector listing including title, price, original price, condition, description, location, and specifications`,
    );
    const extractedData22 = await page.extract({
      instruction: `extract all details from this Canon REALIS SX6 projector listing including title, price, original price, condition, description, location, and specifications`,
      schema: z.object({
        title: z.string().optional(),
        price: z.string().optional(),
        originalPrice: z.string().optional(),
        condition: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        makeModel: z.string().optional(),
        specifications: z.string().optional(),
      }) as any,
    });
    console.log('Extracted:', extractedData22);

    console.log('Workflow completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Workflow failed:', error);
    return { success: false, error };
  } finally {
    // Clean up
    if (stagehand) {
      console.log('Closing Stagehand connection.');
      try {
        await stagehand.close();
      } catch (err) {
        console.error('Error closing Stagehand:', err);
      }
    }
  }
}

// Single execution
runWorkflow().then((result) => {
  console.log('Execution result:', result);
  process.exit(result.success ? 0 : 1);
});

runWorkflow();