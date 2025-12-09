// 测试前端与后端的连接
async function testBackendConnection() {
  try {
    // 测试健康检查端点
    const healthResponse = await fetch('http://127.0.0.1:8000/api/health');
    const healthData = await healthResponse.json();
    console.log('Health Check:', healthData);

    // 测试产品端点
    const productsResponse = await fetch('http://127.0.0.1:8000/api/products');
    const productsData = await productsResponse.json();
    console.log('Products:', productsData);

    return { health: healthData, products: productsData };
  } catch (error) {
    console.error('Error connecting to backend:', error);
    return { error: error.message };
  }
}

// 运行测试
testBackendConnection().then(result => {
  console.log('Test result:', result);
});