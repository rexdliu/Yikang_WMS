from typing import Any, Dict, Optional, Sequence, TYPE_CHECKING
import openai
from app.core.config import settings

if TYPE_CHECKING:
    from openai import OpenAI
    from openai.types.chat import ChatCompletionMessageParam


class AIService:
    def __init__(self):
        if settings.OPENAI_API_KEY:
            self.client: Optional["OpenAI"] = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            self.client = None
    
    def generate_product_insights(self, product_data: Dict[str, Any]) -> str:
        """生成产品洞察"""
        if not self.client:
            return self._fallback_product_insights(product_data)
        
        prompt = f"""
        基于以下产品数据提供洞察：
        产品名称: {product_data.get('name', 'N/A')}
        SKU: {product_data.get('sku', 'N/A')}
        价格: {product_data.get('price', 'N/A')}
        库存数量: {product_data.get('inventory', 'N/A')}
        
        请提供:
        1. 定价建议
        2. 库存管理建议
        3. 销售策略建议
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "你是一个专业的仓库管理顾问。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300
            )
            content = response.choices[0].message.content
            return content or ""
        except Exception as e:
            return f"生成洞察时出错: {str(e)}"
    
    def chat_with_user(self, messages: Sequence["ChatCompletionMessageParam"]) -> str:
        """与用户聊天"""
        if not self.client:
            return "AI服务未配置，请配置 OPENAI_API_KEY。"
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=list(messages),
                max_tokens=500
            )
            content = response.choices[0].message.content
            return content or ""
        except Exception as e:
            return f"聊天时出错: {str(e)}"

    def _fallback_product_insights(self, product_data: Dict[str, Any]) -> str:
        name = product_data.get('name', '该产品')
        sku = product_data.get('sku', '未知 SKU')
        price = product_data.get('price')
        inventory = product_data.get('inventory')

        if isinstance(price, (int, float)):
            if price > 1000:
                price_tip = "保持高端定位并考虑会员折扣，提升复购。"
            elif price < 100:
                price_tip = "尝试捆绑销售或满减活动，提高毛利率。"
            else:
                price_tip = "保持当前定价策略，关注同类竞品调价。"
        else:
            price_tip = "建议补充定价数据以便生成更准确的建议。"

        if isinstance(inventory, (int, float)):
            if inventory < 10:
                stock_tip = "库存偏低，请建立安全库存预警并安排补货。"
            elif inventory > 200:
                stock_tip = "库存偏高，可结合促销或渠道分销加速周转。"
            else:
                stock_tip = "库存水平合理，维持现有补货节奏。"
        else:
            stock_tip = "缺少库存数据，建议先补充实时库存。"

        sales_tip = "结合区域销量表现，设置针对性营销触达渠道。"

        return (
            f"SKU {sku}（{name}）的分析：\n"
            f"1. 定价建议：{price_tip}\n"
            f"2. 库存管理：{stock_tip}\n"
            f"3. 销售策略：{sales_tip}"
        )

# 创建AI服务实例
ai_service = AIService()
