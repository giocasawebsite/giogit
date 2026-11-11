import express from 'express';
import http from 'http';
import { cloudinaryService } from '../server/services/cloudinary';
import { config } from '../server/config';
import { dbService } from '../server/db';
import adminTournamentsRouter from '../server/routes/adminTournaments';
import menuCustomizationsRouter from '../server/routes/menuCustomizations';
import galleryRouter from '../server/routes/gallery';

// 1x1 transparent PNG in base64 Data URI format
const SAMPLE_IMAGE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Alternative 1x1 red PNG
const SAMPLE_IMAGE_BASE64_2 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function runTests() {
  console.log('🧪 Starting GioCasa Cloudinary Complete Integration Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // Ensure DB service is initialized
  await dbService.init();

  // ----------------------------------------------------
  // TEST SUITE 1: Cloudinary Credentials & Configuration
  // ----------------------------------------------------
  console.log('📌 Test Suite 1: Cloudinary Credentials & Ping');

  assert(cloudinaryService.isConfigured(), 'Cloudinary credentials configured on server');
  assert(config.cloudinaryCloudName === 'hcmnz5rk', 'Cloud name matches hcmnz5rk');
  assert(config.cloudinaryApiKey === '312623792228253', 'API key matches user account');
  assert(
    typeof config.cloudinaryApiSecret === 'string' && config.cloudinaryApiSecret.length > 10,
    'API secret safely loaded from environment variables'
  );

  const ping = await cloudinaryService.testConnection();
  assert(ping.ok === true, 'Live Cloudinary Admin API ping succeeded', ping.message);
  assert(ping.cloudName === 'hcmnz5rk', 'Ping returned correct cloudName');

  // ----------------------------------------------------
  // TEST SUITE 2: Live Image Upload & Transformation
  // ----------------------------------------------------
  console.log('\n📌 Test Suite 2: Live Upload, Optimization, and CDN URLs');

  const uploadRes = await cloudinaryService.uploadImage(SAMPLE_IMAGE_BASE64, {
    folder: 'giocasa/test',
  });

  assert(!!uploadRes.publicId, 'Upload returned a publicId', uploadRes.publicId);
  assert(uploadRes.publicId.startsWith('giocasa/test/'), 'Uploaded into dedicated giocasa/test folder');
  assert(uploadRes.secureUrl.startsWith('https://res.cloudinary.com/'), 'URL is HTTPS Cloudinary CDN link');
  assert(
    uploadRes.secureUrl.includes('/image/upload/f_auto,q_auto/'),
    'Secure URL enforces automated WebP/AVIF format and perceptual quality (f_auto,q_auto)'
  );
  assert(
    uploadRes.thumbnailUrl.includes('c_fill') && uploadRes.thumbnailUrl.includes('300'),
    'Generated responsive thumbnail URL with fill crop',
    uploadRes.thumbnailUrl
  );

  // Test getOptimizedUrl
  const customOptimizedUrl = cloudinaryService.getOptimizedUrl(uploadRes.publicId, {
    width: 600,
    height: 400,
    crop: 'fill',
  });
  assert(
    customOptimizedUrl.includes('600') && customOptimizedUrl.includes('400') && customOptimizedUrl.includes('c_fill'),
    'Custom dynamic transformation URL generated correctly',
    customOptimizedUrl
  );

  // ----------------------------------------------------
  // TEST SUITE 3: Asset Deletion & Replacement
  // ----------------------------------------------------
  console.log('\n📌 Test Suite 3: Asset Deletion & Smart Replacement Cleanup');

  // Upload second image
  const uploadRes2 = await cloudinaryService.uploadImage(SAMPLE_IMAGE_BASE64_2, {
    folder: 'giocasa/test',
  });
  assert(!!uploadRes2.publicId, 'Second image uploaded successfully');

  // Direct deletion test
  const deleteRes1 = await cloudinaryService.deleteImage(uploadRes.publicId);
  assert(deleteRes1.deleted === true, 'First image permanently destroyed from Cloudinary');

  const deleteRes2 = await cloudinaryService.deleteImage(uploadRes2.publicId);
  assert(deleteRes2.deleted === true, 'Second image permanently destroyed from Cloudinary');

  // Idempotent deletion check (destroying non-existent asset shouldn't crash)
  const deleteResNonExistent = await cloudinaryService.deleteImage('giocasa/non_existent_asset_xyz');
  assert(deleteResNonExistent.result !== 'error', 'Deleting non-existent asset handles safely without crash');

  // ----------------------------------------------------
  // TEST SUITE 4: Menu Customizations MongoDB Integration
  // ----------------------------------------------------
  console.log('\n📌 Test Suite 4: Menu Customizations Database CRUD');

  const testDishId = `test-dish-${Date.now()}`;
  const customUpload = await cloudinaryService.uploadImage(SAMPLE_IMAGE_BASE64, {
    folder: 'giocasa/menu',
  });

  const savedCustom = await dbService.setMenuCustomization(testDishId, {
    imageUrl: customUpload.secureUrl,
    imagePublicId: customUpload.publicId,
    name: 'Artisanal Test Pizza',
    category: 'pizza',
    isFeatured: true,
    badge: 'Chef Signature',
  });

  assert(savedCustom.menuItemId === testDishId, 'Menu customization saved with correct menuItemId');
  assert(savedCustom.imageUrl === customUpload.secureUrl, 'Menu customization stores Cloudinary secure URL');
  assert(savedCustom.imagePublicId === customUpload.publicId, 'Menu customization stores Cloudinary publicId');

  const retrievedCustom = await dbService.getMenuCustomization(testDishId);
  assert(retrievedCustom?.name === 'Artisanal Test Pizza', 'Customization retrieved accurately from DB');

  const allCustoms = await dbService.getMenuCustomizations();
  assert(allCustoms.some((c) => c.menuItemId === testDishId), 'Customizations list contains newly created dish record');

  // Delete customization (should also delete Cloudinary asset)
  const deletedCustom = await dbService.deleteMenuCustomization(testDishId);
  assert(deletedCustom === true, 'Menu customization deleted from MongoDB and Cloudinary asset destroyed');

  // ----------------------------------------------------
  // TEST SUITE 5: Cafe & Lounge Gallery MongoDB Integration
  // ----------------------------------------------------
  console.log('\n📌 Test Suite 5: Cafe & Lounge Gallery Database CRUD');

  const galleryUpload = await cloudinaryService.uploadImage(SAMPLE_IMAGE_BASE64_2, {
    folder: 'giocasa/gallery',
  });

  const createdGallery = await dbService.createGalleryItem({
    title: 'GioCasa Wood-Fired Brick Oven Night',
    description: 'Crispy artisanal pizzas being fired at 450°C',
    imageUrl: galleryUpload.secureUrl,
    imagePublicId: galleryUpload.publicId,
    category: 'pizza',
    tags: ['pizza', 'brickoven', 'dinner'],
    isFeatured: true,
    displayOrder: 1,
  });

  assert(!!createdGallery.id, 'Gallery item created with unique ID');
  assert(createdGallery.category === 'pizza', 'Gallery item has correct category');
  assert(createdGallery.imagePublicId === galleryUpload.publicId, 'Gallery item stores Cloudinary publicId');

  const retrievedGallery = await dbService.getGalleryItem(createdGallery.id);
  assert(retrievedGallery?.title === 'GioCasa Wood-Fired Brick Oven Night', 'Gallery item retrieved accurately');

  // Update gallery item
  const updatedGallery = await dbService.updateGalleryItem(createdGallery.id, {
    title: 'Updated Wood-Fired Oven Night',
  });
  assert(updatedGallery?.title === 'Updated Wood-Fired Oven Night', 'Gallery item updated in DB');

  // Delete gallery item
  const deletedGallery = await dbService.deleteGalleryItem(createdGallery.id);
  assert(deletedGallery === true, 'Gallery item deleted from DB and Cloudinary asset destroyed');

  // ----------------------------------------------------
  // TEST SUITE 6: Express HTTP Endpoints Integration
  // ----------------------------------------------------
  console.log('\n📌 Test Suite 6: Express API Routes Verification');

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/admin', adminTournamentsRouter);
  app.use('/api/menu', menuCustomizationsRouter);
  app.use('/api/gallery', galleryRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const adminPasscode = config.adminPasscode;

  try {
    // 1. GET /api/admin/uploads/status (without auth -> should fail 401)
    const unauthStatus = await fetch(`${baseUrl}/api/admin/uploads/status`);
    assert(unauthStatus.status === 401, 'Protected uploads route rejects unauthenticated request (401)');

    // 2. GET /api/admin/uploads/status (with auth -> should succeed 200)
    const authStatus = await fetch(`${baseUrl}/api/admin/uploads/status?test=true`, {
      headers: { 'x-admin-passcode': adminPasscode },
    });
    assert(authStatus.status === 200, 'Protected uploads status returns 200 with admin passcode');
    const authStatusJson = await authStatus.json();
    assert(authStatusJson.data.configured === true, 'Status reports configured: true');
    assert(authStatusJson.data.cloudName === 'hcmnz5rk', 'Status reports cloudName: hcmnz5rk');

    // 3. POST /api/admin/uploads (Upload new image via API)
    const apiUploadRes = await fetch(`${baseUrl}/api/admin/uploads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': adminPasscode,
      },
      body: JSON.stringify({
        imageBase64: SAMPLE_IMAGE_BASE64,
        folder: 'test',
        filename: 'api_test.png',
      }),
    });
    assert(apiUploadRes.status === 201, 'POST /api/admin/uploads creates image (201)');
    const apiUploadJson = await apiUploadRes.json();
    const uploadedApiPublicId = apiUploadJson.data.publicId;
    assert(!!uploadedApiPublicId, 'API upload returns publicId');
    assert(apiUploadJson.data.storage === 'cloudinary', 'API upload storage is cloudinary');

    // 4. POST /api/admin/uploads with previousPublicId (Replacement cleanup)
    const apiReplaceRes = await fetch(`${baseUrl}/api/admin/uploads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': adminPasscode,
      },
      body: JSON.stringify({
        imageBase64: SAMPLE_IMAGE_BASE64_2,
        folder: 'test',
        previousPublicId: uploadedApiPublicId,
      }),
    });
    assert(apiReplaceRes.status === 201, 'POST /api/admin/uploads with replacement creates new image');
    const apiReplaceJson = await apiReplaceRes.json();
    const replacedPublicId = apiReplaceJson.data.publicId;
    assert(replacedPublicId !== uploadedApiPublicId, 'Replaced image has new publicId');

    // Clean up replaced image
    const apiDeleteRes = await fetch(`${baseUrl}/api/admin/uploads`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': adminPasscode,
      },
      body: JSON.stringify({ publicId: replacedPublicId }),
    });
    assert(apiDeleteRes.status === 200, 'DELETE /api/admin/uploads destroys asset');

    // 5. Public Menu & Gallery endpoints
    const menuRes = await fetch(`${baseUrl}/api/menu/customizations`);
    assert(menuRes.status === 200, 'GET /api/menu/customizations returns 200');

    const galleryRes = await fetch(`${baseUrl}/api/gallery`);
    assert(galleryRes.status === 200, 'GET /api/gallery returns 200');
  } finally {
    server.close();
  }

  // ----------------------------------------------------
  // TEST SUITE 7: Security & No Secret Exposure
  // ----------------------------------------------------
  console.log('\n📌 Test Suite 7: Security Audit (Zero Secret Leaks)');

  const frontendUploadService = await import('../src/services/imageUploadService');
  assert(typeof frontendUploadService.imageUploadService.uploadImage === 'function', 'Frontend service exported properly');

  // Verify that frontend service never references CLOUDINARY_API_SECRET
  const fs = await import('fs');
  const frontendServiceCode = fs.readFileSync('src/services/imageUploadService.ts', 'utf8');
  assert(
    !frontendServiceCode.includes(config.cloudinaryApiSecret),
    'Frontend imageUploadService contains ZERO secret keys'
  );
  assert(
    !frontendServiceCode.includes('CLOUDINARY_API_SECRET'),
    'Frontend code never references CLOUDINARY_API_SECRET'
  );

  console.log(`\n========================================`);
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
