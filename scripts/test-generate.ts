import dotenv from "dotenv";
dotenv.config();

const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const res = await originalFetch(...args);
  if (args[0]?.toString().includes("api.openai.com")) {
    const clone = res.clone();
    const json = await clone.json();
    console.log("OPENAI RAW RESULT:", JSON.stringify(json, null, 2));
  }
  return res;
};

import { generateCombos } from "../lib/server/combo-studio";

async function run() {
  const itemIds = [
    '27315f7d-b6ea-467a-a2d3-91745d0ffb39', // o1cn01qepel... (TOP)
    '9b2897a6-8193-4189-a931-e01553babff3', // o1cn01mafg... (TOP)
    '474b3c01-cd58-4faa-a409-06127506fdb0', // 10f26dpa... (BOTTOM)
    'b8353209-40e4-49ec-b0a6-c9ce0754d78c', // Maje... (BOTTOM)
    '1b48cee2-1e83-4dbf-bdfd-53e526fdefd9', // 10f25dja... (OUTERWEAR)
    '525f7dbd-85c2-41b3-911c-99e034674027', // 2 ao... (TOP)
    '459357c9-33a2-4252-85b4-d7c642383484'  // 819075552... (FOOTWEAR)
  ];

  try {
    const res = await generateCombos({
      itemIds,
      brief: "Phối bộ đồ dạo phố thanh lịch, dễ mặc, màu sắc hài hòa.",
      budget: 2000000,
      mode: "ai"
    }, "admin-test-" + Date.now());
    console.log("SUCCESS!", res.drafts.length, "drafts");
  } catch (err: any) {
    console.error("FAILED ERROR:", err.code, err.message);
  }
}

run();
