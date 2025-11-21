import { AnalysisResult } from "../types";

// 前端调用 Vercel serverless 函数的地址
const API_URL = "/api/gemini";

export const analyzeSurveyData = async (textData: string, question?: string): Promise<AnalysisResult> => {
  if (!textData.trim()) {
    throw new Error("输入内容不能为空。");
  }

  const contextSection = question 
    ? `背景信息 - 具体的问卷问题列表:\n${question}\n`
    : '';

  const prompt = `
    你是一位资深的中文数据分析专家。请对以下问卷回复进行深入的定性和定量分析。

    ${contextSection}

    **输入数据说明**:
    数据通常包含多个问题板块（由 "--- Qx: ... ---" 分隔）。
    每行回答开头通常有用户标识，例如 "[User 1]", "[A2]" 等。

    **分析任务**:
    
    1.  **coreConclusions (研究核心结论)**:
        *   **overallConclusion**: 用一段话精炼地总结本次研究最主要的发现。
        *   **logicalModules**: 将分散的发现整合为 3-4 个逻辑模块。这些模块应基于问题之间的逻辑关系（例如：现状->原因->影响，或 需求->体验->建议）进行归纳，而不仅仅是按题目罗列。每个模块包含标题和内容。
        *   **actionableInsights**: 基于以上结论，直接提出 4-6 条具体的战略行动建议。
        *   **logicDiagramMermaid**: 请生成一个 **Mermaid JS 格式** 的流程图代码 (graph TD 或 graph LR)，用于可视化展示这些题目或发现之间的逻辑影响路径。
            *   **关键要求**: 不要使用 markdown 代码块标记。
            *   **节点格式**: 节点名称若包含中文或特殊字符，必须使用双引号包裹，例如: A["用户痛点"] --> B["流失原因"]。
            *   只画出 1-3 条核心路径，保持简洁。

    2.  **questionInsights (分题详细分析)**:
        *   针对每一个问题板块，提取 3-5 个核心观点 (Core Points)。
        *   统计大致占比。
        *   **用户原声 (重点优化)**: 对于每个核心观点，请务必从**所有相关回答**中精选出 **1-3 条** 最具代表性的用户原话。
            *   **筛选标准**: 优先选择**语言表达丰富**、**细节详实**、**最能准确反映该观点**的回答。
            *   **严禁**: 绝对不要简单地只截取排序最靠前的用户的回答。请确保引用的回答在内容质量上是最高的，并且尽量覆盖不同的用户。
            *   **格式**: 准确摘录原话（不要改写）并准确标记出处（用户 ID）。

    3.  **userClusters (用户画像)**: 
        *   基于用户回答，聚类为 3-4 个群体。
        *   在 'userIds' 中列出具体的用户标识。

    **输出格式**:
    请严格遵守 JSON Schema。

    问卷数据:
    """
    ${textData}
    """
  `;

  try {
    // 通过 Vercel API Route 发送请求，前端不直接使用 API Key
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // 解析返回结果（保持之前的 JSON clean 和 Mermaid 处理逻辑）
    let parsedResult: AnalysisResult = data;

    if (parsedResult.coreConclusions?.logicDiagramMermaid) {
      let diagram = parsedResult.coreConclusions.logicDiagramMermaid;
      diagram = diagram.replace(/```mermaid\s*/g, "").replace(/```\s*/g, "");
      if (!diagram.startsWith("graph") && !diagram.startsWith("flowchart")) {
         if (diagram.includes("-->")) {
             diagram = "graph TD\n" + diagram;
         }
      }
      parsedResult.coreConclusions.logicDiagramMermaid = diagram.trim();
    }

    return parsedResult;

  } catch (error: any) {
    console.error("Failed to fetch from Vercel API:", error);
    throw new Error("分析请求失败：" + error.message);
  }
};
