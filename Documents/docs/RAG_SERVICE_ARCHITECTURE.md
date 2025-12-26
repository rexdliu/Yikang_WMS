# RAG Service 架构设计文档
**仓库管理系统智能分析、研究、报告服务**

---

## 📋 目录

1. [概述](#概述)
2. [系统架构](#系统架构)
3. [技术栈选择](#技术栈选择)
4. [数据流程](#数据流程)
5. [实施阶段](#实施阶段)
6. [详细设计](#详细设计)
7. [部署方案](#部署方案)
8. [成本估算](#成本估算)

---

## 🎯 概述

### 业务目标

构建一个基于 RAG (Retrieval-Augmented Generation) 的智能分析服务，能够：

- **分析**: 自动分析库存趋势、销售模式、异常检测
- **研究**: 深度挖掘经销商行为、产品性能、市场洞察
- **报告**: 生成自然语言业务报告、可视化图表、决策建议

### 核心能力

```
用户问题 → RAG检索 → 数据分析 → LLM生成 → 智能回答
```

**示例查询:**
- "上个月销售额下降的主要原因是什么？"
- "哪些产品库存周转率最低？"
- "生成本周库存预警报告"
- "对比A、B两个经销商的销售表现"

---

## 🏗️ 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                       前端界面                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ AI助手   │  │ 报告生成 │  │ 数据洞察 │  │ 智能搜索 │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼────────────┼────────────┼────────────┼────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                     │
        ┌────────────▼────────────┐
        │    API Gateway (FastAPI) │
        │  /api/v1/ai/query       │
        │  /api/v1/ai/report      │
        │  /api/v1/ai/analyze     │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │    RAG Orchestrator      │
        │  (业务逻辑层)             │
        └────────────┬────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐        ┌──────▼──────┐
│  Vector Store   │        │   LLM API   │
│  (向量数据库)    │        │  (GPT-4/等)  │
│                 │        │             │
│ - 历史报告      │        │ - 文本生成  │
│ - 业务知识库    │        │ - 数据分析  │
│ - 产品文档      │        │ - 推理决策  │
│ - 常见问题      │        │             │
└────────┬────────┘        └─────────────┘
         │
    ┌────▼─────────────────────┐
    │   Embedding Service       │
    │  (文本向量化)              │
    │  - text-embedding-3-small │
    │  - all-MiniLM-L6-v2       │
    └───────────┬───────────────┘
                │
    ┌───────────▼───────────────┐
    │   Knowledge Base           │
    │  (知识库管理)               │
    │                            │
    │ ┌────────────────────────┐│
    │ │  Document Processor    ││
    │ │  - PDF解析             ││
    │ │  - Excel解析           ││
    │ │  - Text分块            ││
    │ └────────────────────────┘│
    │                            │
    │ ┌────────────────────────┐│
    │ │  Data Connector        ││
    │ │  - MySQL数据库         ││
    │ │  - API数据源           ││
    │ │  - 实时查询            ││
    │ └────────────────────────┘│
    └────────────────────────────┘
```

---

## 🛠️ 技术栈选择

### 后端技术栈

| 组件 | 推荐方案 | 替代方案 | 理由 |
|------|----------|----------|------|
| **RAG框架** | LangChain | LlamaIndex | 生态完善，社区活跃 |
| **向量数据库** | Qdrant | Pinecone, Weaviate, Chroma | 开源，支持Docker，性能好 |
| **Embedding模型** | OpenAI text-embedding-3-small | sentence-transformers | 性价比高，API简单 |
| **LLM** | GPT-4o-mini | Claude-3.5-Sonnet, Qwen | 成本低，速度快，质量高 |
| **任务队列** | Celery + Redis | RQ | 异步处理长任务 |
| **缓存层** | Redis | Memcached | 缓存查询结果 |

### 数据库设计

```sql
-- RAG 知识库表
CREATE TABLE knowledge_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL,  -- report, manual, faq, policy
    source VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_content_type (content_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 向量索引映射表（存储向量ID和知识库ID的映射）
CREATE TABLE vector_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    knowledge_base_id INT NOT NULL,
    vector_id VARCHAR(255) NOT NULL,  -- Qdrant中的向量ID
    chunk_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_base(id) ON DELETE CASCADE,
    INDEX idx_vector_id (vector_id),
    INDEX idx_knowledge_base_id (knowledge_base_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI 查询历史表
CREATE TABLE ai_query_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    query TEXT NOT NULL,
    response TEXT,
    retrieved_chunks JSON,  -- 检索到的文档块
    llm_model VARCHAR(50),
    execution_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 自动生成报告表
CREATE TABLE generated_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,  -- weekly, monthly, alert, custom
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data_snapshot JSON,  -- 生成报告时的数据快照
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_report_type (report_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 🔄 数据流程

### 1. 知识库构建流程

```
┌──────────────┐
│  数据源       │
│ - 业务报告    │
│ - 产品手册    │
│ - 历史数据    │
│ - FAQ文档     │
└───────┬──────┘
        │
        ▼
┌──────────────┐
│ 文档解析器    │
│ - PDF→Text   │
│ - Excel→JSON │
│ - HTML→Text  │
└───────┬──────┘
        │
        ▼
┌──────────────┐
│ 文本分块      │
│ - 按段落分割  │
│ - 重叠窗口    │
│ - 保留元数据  │
└───────┬──────┘
        │
        ▼
┌──────────────┐
│ Embedding     │
│ - 批量向量化  │
│ - 维度: 1536  │
└───────┬──────┘
        │
        ▼
┌──────────────┐
│ 向量存储      │
│ - Qdrant DB  │
│ - 索引优化    │
└──────────────┘
```

### 2. 查询处理流程

```
用户输入: "上个月哪个产品库存周转率最低？"
    │
    ▼
┌──────────────────────────────┐
│ 1. 意图识别                   │
│    类型: 数据查询             │
│    需要: SQL + RAG            │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 2. 向量检索                   │
│    Query Embedding            │
│    → Qdrant相似度搜索         │
│    → Top-K文档（K=5）         │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 3. 数据库查询                 │
│    LLM生成SQL:                │
│    SELECT p.name,             │
│      SUM(sales)/AVG(inv)      │
│    FROM ...                   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 4. 上下文构建                 │
│    检索结果 + SQL结果         │
│    + 业务规则 + 历史上下文     │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 5. LLM生成回答                │
│    Prompt:                    │
│    - System: 你是数据分析师   │
│    - Context: [检索内容]      │
│    - Question: [用户问题]     │
│    - Data: [SQL结果]          │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 6. 回答优化                   │
│    - Markdown格式化           │
│    - 添加可视化建议           │
│    - 相关问题推荐             │
└──────────┬───────────────────┘
           │
           ▼
    返回给用户
```

---

## 📅 实施阶段

### Phase 1: 基础设施搭建 (2周)

**目标**: 建立RAG基础框架

```python
# Week 1: 环境和依赖
src/Backend/
├── app/
│   ├── ai/
│   │   ├── __init__.py
│   │   ├── embeddings.py       # Embedding服务
│   │   ├── vector_store.py     # 向量数据库接口
│   │   ├── llm_client.py       # LLM API客户端
│   │   └── rag_pipeline.py     # RAG主流程
│   ├── services/
│   │   └── ai_service.py       # AI业务逻辑
│   └── api/v1/
│       └── ai.py               # AI API端点
```

**任务清单**:
- [x] 安装依赖: `langchain`, `qdrant-client`, `openai`
- [x] 配置Qdrant Docker容器
- [x] 实现Embedding服务
- [x] 创建向量存储接口
- [x] 基础LLM调用封装

**Docker Compose配置**:
```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    environment:
      - QDRANT_ALLOW_RECOVERY_MODE=true

volumes:
  qdrant_storage:
```

### Phase 2: 知识库建设 (2周)

**目标**: 导入业务知识和历史数据

**数据源**:
1. **业务文档**
   - 产品手册（PDF）
   - 操作流程（Markdown）
   - 常见问题（JSON）

2. **历史数据**
   - 过去12个月销售数据
   - 库存变化记录
   - 经销商交易历史

3. **分析报告**
   - 自动生成周报/月报模板
   - 历史分析结果

**代码示例**:
```python
# src/Backend/app/ai/knowledge_builder.py

from langchain.document_loaders import PDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Qdrant
from qdrant_client import QdrantClient

class KnowledgeBuilder:
    def __init__(self):
        self.client = QdrantClient(url="http://localhost:6333")
        self.collection_name = "warehouse_knowledge"

    async def build_from_documents(self, doc_paths: List[str]):
        """从文档构建知识库"""
        documents = []

        # 1. 加载文档
        for path in doc_paths:
            if path.endswith('.pdf'):
                loader = PDFLoader(path)
            else:
                loader = TextLoader(path)
            documents.extend(loader.load())

        # 2. 文本分块
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", "。", "！", "？", " ", ""]
        )
        chunks = text_splitter.split_documents(documents)

        # 3. 向量化并存储
        vectorstore = Qdrant(
            client=self.client,
            collection_name=self.collection_name,
            embeddings=self.get_embedding_function()
        )

        await vectorstore.aadd_documents(chunks)

        return len(chunks)

    async def build_from_database(self):
        """从数据库构建知识库"""
        # 查询历史销售、库存、订单数据
        # 转换为文本描述
        # 向量化存储
        pass
```

### Phase 3: RAG核心功能 (3周)

**目标**: 实现完整的RAG查询流程

**核心组件**:

```python
# src/Backend/app/ai/rag_pipeline.py

from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from qdrant_client import QdrantClient

class RAGPipeline:
    def __init__(self, config):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=config.OPENAI_API_KEY
        )

        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small"
        )

        self.vector_store = self._init_vector_store()

    def _init_vector_store(self):
        """初始化向量存储"""
        client = QdrantClient(url="http://localhost:6333")
        from langchain_community.vectorstores import Qdrant

        return Qdrant(
            client=client,
            collection_name="warehouse_knowledge",
            embeddings=self.embeddings
        )

    async def query(self, question: str, user_context: dict = None):
        """处理用户查询"""

        # 1. 意图识别
        intent = await self._classify_intent(question)

        # 2. 向量检索
        relevant_docs = await self.vector_store.asimilarity_search(
            question,
            k=5
        )

        # 3. 数据库查询（如果需要）
        db_results = None
        if intent.requires_data:
            db_results = await self._execute_sql_query(question)

        # 4. 构建上下文
        context = self._build_context(
            question=question,
            documents=relevant_docs,
            db_results=db_results,
            user_context=user_context
        )

        # 5. 生成回答
        prompt = PromptTemplate(
            template="""你是一个专业的仓库管理数据分析师。

基于以下信息回答用户问题：

相关文档:
{documents}

数据库查询结果:
{data}

用户问题: {question}

请提供详细、准确的分析，并给出可执行的建议。""",
            input_variables=["documents", "data", "question"]
        )

        chain = prompt | self.llm

        response = await chain.ainvoke({
            "documents": "\n".join([doc.page_content for doc in relevant_docs]),
            "data": str(db_results) if db_results else "无",
            "question": question
        })

        return {
            "answer": response.content,
            "sources": [doc.metadata for doc in relevant_docs],
            "data": db_results
        }

    async def _classify_intent(self, question: str):
        """分类用户意图"""
        # 简单实现：使用LLM分类
        # 类型：数据查询、趋势分析、异常检测、报告生成
        pass

    async def _execute_sql_query(self, question: str):
        """生成并执行SQL查询"""
        # 使用LLM生成SQL
        # 验证安全性
        # 执行查询
        pass
```

### Phase 4: 报告生成 (2周)

**目标**: 自动生成业务报告

**报告类型**:
1. **周报**: 销售汇总、库存变化、异常警报
2. **月报**: 趋势分析、KPI达成、改进建议
3. **专项报告**: 产品分析、经销商分析、库存优化

```python
# src/Backend/app/ai/report_generator.py

class ReportGenerator:
    async def generate_weekly_report(self, week_start: date):
        """生成周报"""

        # 1. 收集数据
        data = await self._collect_weekly_data(week_start)

        # 2. RAG分析
        insights = await self.rag.analyze_trends(data)

        # 3. 生成报告
        prompt = """基于以下数据生成本周业务报告：

销售数据: {sales}
库存数据: {inventory}
异常事件: {alerts}
历史对比: {comparison}

请生成包含以下部分的Markdown报告：
1. 执行摘要
2. 关键指标
3. 趋势分析
4. 异常警报
5. 改进建议"""

        report = await self.llm.ainvoke(prompt.format(**data))

        # 4. 保存报告
        await self._save_report(report, "weekly", week_start)

        return report
```

### Phase 5: 前端集成 (2周)

**目标**: 提供用户界面

**页面设计**:

```typescript
// src/pages/AIAssistant.tsx

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);

    const response = await apiService.aiQuery({
      question: input,
      context: {
        user_id: currentUser.id,
        history: messages.slice(-5)
      }
    });

    setMessages([
      ...messages,
      { role: 'user', content: input },
      { role: 'assistant', content: response.answer, sources: response.sources }
    ]);

    setLoading(false);
  };

  return (
    <div className="ai-assistant">
      <ChatMessages messages={messages} />
      <ChatInput value={input} onChange={setInput} onSend={handleSend} />
      <QuickActions />  {/* 快捷问题 */}
    </div>
  );
};
```

**快捷查询模板**:
- "生成本周库存报告"
- "分析销售下降原因"
- "哪些产品需要补货？"
- "对比A/B经销商表现"

### Phase 6: 优化和监控 (持续)

**优化方向**:
1. **性能优化**
   - 查询结果缓存
   - 向量检索加速
   - 批量处理

2. **质量优化**
   - Prompt工程
   - Few-shot示例
   - 答案验证

3. **成本优化**
   - 智能路由（简单问题用小模型）
   - Token计数和限制
   - 缓存策略

**监控指标**:
```python
# src/Backend/app/ai/metrics.py

class AIMetrics:
    """AI服务监控"""

    metrics = {
        "query_count": Counter,
        "avg_response_time": Histogram,
        "llm_token_usage": Counter,
        "vector_search_time": Histogram,
        "cache_hit_rate": Gauge
    }
```

---

## 🚀 部署方案

### Docker Compose 完整配置

```yaml
version: '3.8'

services:
  # 现有服务
  backend:
    # ... 现有配置
    depends_on:
      - qdrant
      - redis
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - QDRANT_URL=http://qdrant:6333

  # 向量数据库
  qdrant:
    image: qdrant/qdrant:v1.8.0
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      - QDRANT_ALLOW_RECOVERY_MODE=true

  # Redis (用于缓存和任务队列)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Celery Worker (异步任务)
  celery_worker:
    build: ./src/Backend
    command: celery -A app.workers worker -l info
    depends_on:
      - redis
      - backend
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0

  # Celery Beat (定时任务)
  celery_beat:
    build: ./src/Backend
    command: celery -A app.workers beat -l info
    depends_on:
      - redis
      - celery_worker

volumes:
  qdrant_data:
  redis_data:
```

---

## 💰 成本估算

### 开发成本

| 阶段 | 工时 | 说明 |
|------|------|------|
| Phase 1 | 80h | 基础设施 |
| Phase 2 | 80h | 知识库 |
| Phase 3 | 120h | RAG核心 |
| Phase 4 | 80h | 报告生成 |
| Phase 5 | 80h | 前端集成 |
| Phase 6 | 40h/月 | 持续优化 |

**总计**: ~520小时（约3个月）

### 运营成本（月度）

| 项目 | 成本 | 说明 |
|------|------|------|
| **OpenAI API** | $50-200 | 1M tokens ≈ $0.10-0.60 |
| **服务器** | $50-100 | 4C8G云服务器 |
| **Qdrant** | $0 | 自托管 |
| **Redis** | $0 | 自托管 |
| **总计** | **$100-300** | 取决于使用量 |

### 成本优化建议

1. **使用本地Embedding模型**
   - 节省70%+ Embedding成本
   - 模型: `sentence-transformers/all-MiniLM-L6-v2`

2. **智能路由**
   ```python
   def route_query(question: str):
       complexity = analyze_complexity(question)

       if complexity == "simple":
           return "gpt-4o-mini"  # $0.15/1M tokens
       elif complexity == "medium":
           return "gpt-4o"        # $2.50/1M tokens
       else:
           return "o1-preview"    # $15/1M tokens
   ```

3. **缓存策略**
   - 相似问题缓存（余弦相似度 > 0.95）
   - 数据库查询结果缓存
   - 报告模板缓存

---

## 📊 性能指标

### 目标KPI

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 查询响应时间 | < 3秒 | P95 |
| 答案准确率 | > 90% | 人工评估 |
| 向量检索时间 | < 100ms | P99 |
| 缓存命中率 | > 60% | Redis metrics |
| 可用性 | 99.5% | Uptime monitoring |

---

## 🔐 安全考虑

### 数据安全

1. **SQL注入防护**
   ```python
   def validate_generated_sql(sql: str) -> bool:
       """验证LLM生成的SQL"""
       # 只允许SELECT查询
       if not sql.strip().upper().startswith("SELECT"):
           return False

       # 禁止危险关键字
       dangerous = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER"]
       if any(kw in sql.upper() for kw in dangerous):
           return False

       return True
   ```

2. **权限控制**
   - 用户只能查询自己权限范围内的数据
   - 敏感信息脱敏

3. **API限流**
   ```python
   from slowapi import Limiter

   limiter = Limiter(key_func=get_remote_address)

   @app.post("/api/v1/ai/query")
   @limiter.limit("10/minute")
   async def ai_query(request: QueryRequest):
       ...
   ```

---

## 📈 未来扩展

### 阶段性增强

1. **多模态支持** (6个月后)
   - 图表识别和分析
   - 语音输入/输出

2. **预测分析** (9个月后)
   - 销售预测
   - 库存优化建议
   - 异常预警

3. **多语言支持** (12个月后)
   - 中英文双语
   - 自动翻译

4. **Agent系统** (18个月后)
   - 自主执行任务
   - 多步骤推理
   - 工具调用

---

## 📚 参考资源

### 学习资料

- [LangChain Documentation](https://python.langchain.com/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [OpenAI API Reference](https://platform.openai.com/docs)

### 开源项目

- [Quivr](https://github.com/QuivrHQ/quivr) - RAG应用参考
- [Danswer](https://github.com/danswer-ai/danswer) - 企业搜索
- [ChatFiles](https://github.com/guangzhengli/ChatFiles) - 文档问答

---

## 🎯 快速开始

### 最小可行产品 (MVP)

**1周快速验证** - 只实现核心功能：

```bash
# 1. 安装依赖
pip install langchain openai qdrant-client

# 2. 启动Qdrant
docker run -p 6333:6333 qdrant/qdrant

# 3. 创建简单RAG
python scripts/simple_rag.py

# 4. 测试查询
curl -X POST http://localhost:8000/api/v1/ai/query \
  -H "Content-Type: application/json" \
  -d '{"question": "本月销售额是多少？"}'
```

**simple_rag.py**:
```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Qdrant
from qdrant_client import QdrantClient

# 初始化
llm = ChatOpenAI(model="gpt-4o-mini")
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

client = QdrantClient(url="http://localhost:6333")
vectorstore = Qdrant(client, "test", embeddings)

# 添加示例知识
docs = ["2024年10月销售额: $125,000", "库存周转率: 4.5次/月"]
vectorstore.add_texts(docs)

# 查询
def query(question: str):
    # 检索
    docs = vectorstore.similarity_search(question, k=2)
    context = "\n".join([d.page_content for d in docs])

    # 生成
    response = llm.invoke(f"Context: {context}\n\nQuestion: {question}")
    return response.content

print(query("本月销售额是多少？"))
```

---

## 📞 支持与反馈

如有问题或建议，请联系开发团队或提交Issue。

---

**版本**: v1.0
**最后更新**: 2025-11-13
**作者**: Claude Code AI Assistant
