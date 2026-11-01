// ═══════════════════════════════════════════════════════════════════════
//  DEBUG ENDPOINT — ทดสอบ Firestore write โดยตรง
//  URL: https://smartmailbox-dashboard.vercel.app/api/debug
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  };

  // ─── STEP 1: Check env var ───────────────────────────────────────────
  const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  result.steps.push({
    step: 1,
    name: "Check FIREBASE_SERVICE_ACCOUNT env var",
    env_var_exists: rawEnv.length > 0,
    env_var_length: rawEnv.length,
    env_var_starts_with: rawEnv.substring(0, 10),
    env_var_ends_with: rawEnv.substring(rawEnv.length - 10),
  });

  if (rawEnv.length === 0) {
    result.error = "FIREBASE_SERVICE_ACCOUNT env var is empty!";
    return NextResponse.json(result, { status: 500 });
  }

  // ─── STEP 2: Parse JSON ─────────────────────────────────────────────
  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(rawEnv);
    result.steps.push({
      step: 2,
      name: "Parse JSON",
      success: true,
      project_id: serviceAccount.project_id,
      client_email: serviceAccount.client_email,
      has_private_key: !!serviceAccount.private_key,
    });
  } catch (err: any) {
    result.steps.push({
      step: 2,
      name: "Parse JSON",
      success: false,
      error: err.message,
      raw_first_50_chars: rawEnv.substring(0, 50),
    });
    result.error = "JSON parse failed: " + err.message;
    return NextResponse.json(result, { status: 500 });
  }

  // ─── STEP 3: Initialize Firebase ───────────────────────────────────
  let db: ReturnType<typeof getFirestore> | null = null;
  try {
    if (getApps().length === 0) {
      const app = initializeApp({
        credential: cert(serviceAccount),
      });
      result.steps.push({
        step: 3,
        name: "Initialize Firebase App",
        success: true,
        app_name: app.name,
      });
    } else {
      result.steps.push({
        step: 3,
        name: "Initialize Firebase App",
        success: true,
        note: "Already initialized",
      });
    }
    db = getFirestore();
    result.steps.push({
      step: 3.1,
      name: "Get Firestore instance",
      success: db !== null,
    });
  } catch (err: any) {
    result.steps.push({
      step: 3,
      name: "Initialize Firebase",
      success: false,
      error: err.message,
    });
    result.error = "Firebase init failed: " + err.message;
    return NextResponse.json(result, { status: 500 });
  }

  // ─── STEP 4: Try WRITE to Firestore ─────────────────────────────────
  const testDocRef = db.collection("debug_test").doc("test_" + Date.now());
  try {
    await testDocRef.set({
      message: "Hello from debug endpoint",
      timestamp: new Date(),
      test: true,
    });
    result.steps.push({
      step: 4,
      name: "WRITE to debug_test collection",
      success: true,
      doc_id: testDocRef.id,
    });
  } catch (err: any) {
    result.steps.push({
      step: 4,
      name: "WRITE to debug_test collection",
      success: false,
      error: err.message,
      error_code: err.code,
    });
    result.error = "Write failed: " + err.message;
    return NextResponse.json(result, { status: 500 });
  }

  // ─── STEP 5: Try READ from Firestore ───────────────────────────────
  try {
    const doc = await testDocRef.get();
    result.steps.push({
      step: 5,
      name: "READ back the test doc",
      success: doc.exists,
      data: doc.data(),
    });
  } catch (err: any) {
    result.steps.push({
      step: 5,
      name: "READ back the test doc",
      success: false,
      error: err.message,
    });
  }

  // ─── STEP 6: List collections ──────────────────────────────────────
  try {
    const collections = await db.listCollections();
    result.steps.push({
      step: 6,
      name: "List collections",
      success: true,
      collections: collections.map((c: any) => c.id),
    });
  } catch (err: any) {
    result.steps.push({
      step: 6,
      name: "List collections",
      success: false,
      error: err.message,
    });
  }

  result.success = true;
  result.message = "All steps completed. Check Firestore Database → Data tab for the debug_test collection!";
  return NextResponse.json(result, { status: 200 });
}
