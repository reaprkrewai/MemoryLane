/**
 * Citation parsing tests for Q&A service
 *
 * These tests verify the parseCitations function which extracts [Entry ID] citations
 * from LLM responses. Tests are manually verifiable without a test framework.
 */

import { parseCitations } from "./qaService";

// Test 1: Extract single citation
function testSingleCitation() {
  const text =
    "You felt stressed [Entry abc123-def4-5678-90ab-cdef12345678]. Check this entry.";
  const result = parseCitations(text);
  const passes = result.length === 1 && result[0] === "abc123-def4-5678-90ab-cdef12345678";
  console.log(
    `Test 1 (single citation): ${passes ? "PASS" : "FAIL"}`,
    passes ? "" : `Expected ["abc123-def4-5678-90ab-cdef12345678"], got ${JSON.stringify(result)}`
  );
  return passes;
}

// Test 2: Extract multiple citations
function testMultipleCitations() {
  const text =
    "First entry [Entry abc123-def4-5678-90ab-cdef12345678]. Second [Entry xyz789-def4-5678-90ab-cdef12345678].";
  const result = parseCitations(text);
  const passes =
    result.length === 2 &&
    result.includes("abc123-def4-5678-90ab-cdef12345678") &&
    result.includes("xyz789-def4-5678-90ab-cdef12345678");
  console.log(
    `Test 2 (multiple citations): ${passes ? "PASS" : "FAIL"}`,
    passes ? "" : `Expected 2 unique citations, got ${JSON.stringify(result)}`
  );
  return passes;
}

// Test 3: Deduplicate citations
function testDuplicateCitations() {
  const text =
    "Check [Entry same-id-1234-5678-90ab-cdef12345678] and again [Entry same-id-1234-5678-90ab-cdef12345678].";
  const result = parseCitations(text);
  const passes = result.length === 1 && result[0] === "same-id-1234-5678-90ab-cdef12345678";
  console.log(
    `Test 3 (deduplicate): ${passes ? "PASS" : "FAIL"}`,
    passes ? "" : `Expected 1 unique citation, got ${JSON.stringify(result)}`
  );
  return passes;
}

// Test 4: No citations
function testNoCitations() {
  const text = "No citations here. Just regular text.";
  const result = parseCitations(text);
  const passes = result.length === 0;
  console.log(
    `Test 4 (no citations): ${passes ? "PASS" : "FAIL"}`,
    passes ? "" : `Expected empty array, got ${JSON.stringify(result)}`
  );
  return passes;
}

// Test 5: UUID format
function testUUIDFormat() {
  const text =
    "You mentioned anxiety [Entry xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx]. Also work [Entry 12345678-abcd-ef01-2345-6789abcdef01].";
  const result = parseCitations(text);
  const passes = result.length === 2;
  console.log(
    `Test 5 (UUID format): ${passes ? "PASS" : "FAIL"}`,
    passes ? "" : `Expected 2 citations, got ${JSON.stringify(result)}`
  );
  return passes;
}

// Test 6: Case insensitivity
function testCaseInsensitivity() {
  const text = "[entry abc123-def4-5678-90ab-cdef12345678] and [ENTRY xyz789-def4-5678-90ab-cdef12345678]";
  const result = parseCitations(text);
  const passes = result.length === 2;
  console.log(
    `Test 6 (case insensitive): ${passes ? "PASS" : "FAIL"}`,
    passes ? "" : `Expected 2 citations regardless of case, got ${JSON.stringify(result)}`
  );
  return passes;
}

// Test 7: Real-world example
function testRealWorldExample() {
  const text =
    'You mentioned being "stressed about deadlines" in [Entry 2026-04-10-stress-deadline]. ' +
    "This is similar to your earlier entry [Entry 2026-04-05-work-anxiety] where you discussed project pressure. " +
    "Both entries highlight your concerns about time management, which you resolved by [Entry 2026-04-15-completed-project].";
  const result = parseCitations(text);
  const passes = result.length === 3;
  console.log(
    `Test 7 (real-world): ${passes ? "PASS" : "FAIL"}`,
    passes ? "" : `Expected 3 citations, got ${JSON.stringify(result)}`
  );
  return passes;
}

// Manual integration test (requires Ollama to be running)
/**
 * Manual integration test for full Q&A pipeline:
 *
 * Prerequisites:
 * 1. Ollama running on localhost:11434
 * 2. nomic-embed-text model installed
 * 3. llama2:7b model installed
 * 4. App must have at least 2-3 test entries in database
 *
 * Steps:
 * 1. Navigate to Search → AI Search tab
 * 2. Type question: "when did I feel anxious?"
 * 3. Click "Ask" or press Enter
 * 4. Wait 5-8 seconds for LLM inference
 * 5. Verify:
 *    - Answer appears with relevant information
 *    - Answer contains [Entry XXXXX] citations
 *    - Citations are clickable links
 *    - Clicking citation opens the full entry in editor
 *    - Answer is grounded in journal content (not hallucinated)
 */
export function runManualTests() {
  console.log("=== Q&A Service Unit Tests ===\n");

  const tests = [
    testSingleCitation,
    testMultipleCitations,
    testDuplicateCitations,
    testNoCitations,
    testUUIDFormat,
    testCaseInsensitivity,
    testRealWorldExample,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    if (test()) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n=== Test Summary ===`);
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);

  if (failed === 0) {
    console.log("\nAll unit tests passed!");
  }

  return failed === 0;
}
