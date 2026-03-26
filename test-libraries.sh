#!/bin/bash

# 测试词库 API

API_URL="https://caiyuyang.cn:3001/api"

echo "======================================"
echo "📚 词库 API 测试"
echo "======================================"

# 1. 登录获取 token
echo ""
echo "1️⃣  登录获取 token..."
LOGIN_RESPONSE=$(curl -k -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "登录响应：${LOGIN_RESPONSE:0:200}..."

# 提取 token（简单方式）
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 获取 token 失败"
  exit 1
fi

echo "✅ Token 获取成功：${TOKEN:0:50}..."
echo ""

# 2. 测试词库列表 API
echo "2️⃣  测试词库列表 API..."
echo "请求：GET ${API_URL}/words/libraries"
echo ""

LIBRARIES_RESPONSE=$(curl -k -s "${API_URL}/words/libraries" \
  -H "Authorization: Bearer ${TOKEN}")

echo "响应："
echo "${LIBRARIES_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${LIBRARIES_RESPONSE}"

echo ""
echo "======================================"
echo "✅ 测试完成"
echo "======================================"
