/*
 * DualSubs Netflix DFXP 字幕注入脚本
 * 
 * 功能：拦截 Netflix 字幕 CDN 响应，从指定 URL 下载 DFXP 格式字幕并替换原始字幕
 * 平台：Shadowrocket / Surge / Quantumult X
 * 
 * ⚠️ 修改下方 DFXP_SUBTITLE_URL 变量为你的 DFXP 字幕文件下载地址
 */

/***************** 配置区域 - 修改此处 *****************/

// DFXP 字幕文件的下载 URL（修改为你自己的地址）
const DFXP_SUBTITLE_URL = "https://raw.githubusercontent.com/liworlford/KivoSub/refs/heads/main/WeatheringwithYou2019JAPANESE1080pBluRayx264DTS-FGTch.dfxp";

/***************** 配置区域结束 *****************/

const NAME = "DualSubs.Netflix.DFXP";

// 兼容多平台的工具函数
const $platform = (() => {
    if (typeof $loon !== "undefined") return "Loon";
    if (typeof $task !== "undefined") return "Quantumult X";
    if (typeof module !== "undefined" && typeof $done !== "undefined") return "Node.js";
    if (typeof $httpClient !== "undefined") return "Surge";
    if (typeof $rocket !== "undefined") return "Shadowrocket";
    return "Surge"; // 默认
})();

function log(...args) {
    console.log(`[${NAME}]`, ...args);
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const options = { url: url, headers: {} };
        
        if (typeof $task !== "undefined") {
            // Quantumult X
            $task.fetch(options).then(
                response => resolve(response),
                reason => reject(reason.error || reason)
            );
        } else if (typeof $httpClient !== "undefined") {
            // Surge / Shadowrocket / Loon
            $httpClient.get(options, (error, response, data) => {
                if (error) reject(error);
                else resolve({ status: response.status, body: data });
            });
        } else {
            reject(new Error("Unsupported platform"));
        }
    });
}

function done(response) {
    if (typeof $done !== "undefined") $done(response);
}

/***************** 主处理逻辑 *****************/
(async () => {
    log(`⚠ 拦截到 Netflix 字幕请求: ${$request.url}`);
    
    // 检查 DFXP URL 是否已配置
    if (!DFXP_SUBTITLE_URL || DFXP_SUBTITLE_URL === "https://example.com/your-subtitle.dfxp") {
        log(`⚠ DFXP_SUBTITLE_URL 未配置，跳过注入，返回原始字幕`);
        done($response);
        return;
    }

    log(`⚠ 正在从 URL 下载 DFXP 字幕: ${DFXP_SUBTITLE_URL}`);
    
    try {
        // 从指定 URL 下载 DFXP 字幕
        const dfxpResponse = await httpGet(DFXP_SUBTITLE_URL);
        
        if (dfxpResponse && dfxpResponse.body) {
            log(`✅ DFXP 字幕下载成功, 大小: ${dfxpResponse.body.length} 字节`);
            
            // 用下载的 DFXP 字幕替换原始响应体
            $response.body = dfxpResponse.body;
            
            // 更新 Content-Type 为 DFXP/TTML 格式
            if ($response.headers) {
                // DFXP 是 TTML 的早期名称，MIME 类型相同
                const contentTypeKey = $response.headers["Content-Type"] ? "Content-Type" : "content-type";
                $response.headers[contentTypeKey] = "application/ttml+xml; charset=utf-8";
                
                // 移除 Content-Length（因为 body 长度已变化）
                delete $response.headers["Content-Length"];
                delete $response.headers["content-length"];
                
                // 移除 Content-Encoding（确保不做压缩处理）
                delete $response.headers["Content-Encoding"];
                delete $response.headers["content-encoding"];
            }
            
            log(`✅ DFXP 字幕注入完成`);
        } else {
            log(`❌ DFXP 字幕下载失败: 响应为空，返回原始字幕`);
        }
    } catch (error) {
        log(`❌ DFXP 字幕下载出错: ${error}, 返回原始字幕`);
    }
})()
    .catch(e => log(`❌ 脚本执行��错: ${e}`))
    .finally(() => done($response));
