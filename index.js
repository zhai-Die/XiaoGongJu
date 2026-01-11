// 小工具 - SillyTavern Extension
// 提供楼层隐藏/取消隐藏功能

const EXTENSION_NAME = '小工具';
const STORAGE_KEY = 'xiaogongju_config';

// 默认配置
const DEFAULT_CONFIG = {
    // 隐藏楼层配置
    hideStart: '',
    hideEnd: '',
    // 取消隐藏楼层配置
    unhideStart: '',
    unhideEnd: '',
    // 楼层消息配置
    floorNumber: '',
    floorContent: '',
    // 重试配置
    retryInterval: '1000',
    maxRetries: '10',
    // 延迟配置
    initDelay: '0'
};

// 当前配置缓存
let currentConfig = null;

/**
 * 从浏览器加载配置
 */
function loadConfig() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            currentConfig = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        } else {
            currentConfig = { ...DEFAULT_CONFIG };
        }
    } catch (e) {
        console.error(`[${EXTENSION_NAME}] 加载配置失败:`, e);
        currentConfig = { ...DEFAULT_CONFIG };
    }
    return currentConfig;
}

/**
 * 保存配置到浏览器
 */
function saveConfig(config) {
    try {
        currentConfig = { ...currentConfig, ...config };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig));
        console.log(`[${EXTENSION_NAME}] 配置已保存`);
        return true;
    } catch (e) {
        console.error(`[${EXTENSION_NAME}] 保存配置失败:`, e);
        return false;
    }
}

/**
 * 验证是否为纯数字
 */
function isValidNumber(value) {
    if (value === '' || value === null || value === undefined) return true; // 空值允许
    return /^\d+$/.test(String(value).trim());
}

/**
 * 获取最新楼层数（聊天消息数量）
 */
function getLatestFloorNumber() {
    try {
        const context = getContext();
        if (context && context.chat) {
            return context.chat.length;
        }
    } catch (e) {
        console.error(`[${EXTENSION_NAME}] 获取楼层数失败:`, e);
    }
    return 0;
}

/**
 * 验证楼层范围
 */
function validateFloorRange(start, end) {
    const startNum = parseInt(start);
    const endNum = parseInt(end);
    const latestFloor = getLatestFloorNumber();

    if (isNaN(startNum) || isNaN(endNum)) {
        return { valid: false, message: '楼层数必须为数字' };
    }

    if (startNum < 0 || endNum < 0) {
        return { valid: false, message: '楼层数不能为负数' };
    }

    if (startNum > endNum) {
        return { valid: false, message: '起始楼层不能大于结束楼层' };
    }

    if (endNum > latestFloor) {
        return { valid: false, message: `结束楼层(${endNum})大于最新楼层数(${latestFloor})` };
    }

    return { valid: true };
}

/**
 * 验证单个楼层
 */
function validateSingleFloor(floor) {
    const floorNum = parseInt(floor);
    const latestFloor = getLatestFloorNumber();

    if (isNaN(floorNum)) {
        return { valid: false, message: '楼层数必须为数字' };
    }

    if (floorNum < 0) {
        return { valid: false, message: '楼层数不能为负数' };
    }

    if (floorNum > latestFloor) {
        return { valid: false, message: `目标楼层(${floorNum})大于最新楼层数(${latestFloor})` };
    }

    return { valid: true };
}

/**
 * 隐藏指定范围的楼层
 */
async function hideFloors(start, end) {
    try {
        const context = getContext();
        if (!context || !context.chat) {
            toastr.error('无法获取聊天上下文');
            return false;
        }

        const startNum = parseInt(start);
        const endNum = parseInt(end);

        for (let i = startNum; i <= endNum; i++) {
            if (context.chat[i]) {
                context.chat[i].is_system = true;
                context.chat[i].is_hidden = true;
            }
        }

        await context.saveChat();
        console.log(`[${EXTENSION_NAME}] 已隐藏楼层 ${startNum} ~ ${endNum}`);
        return true;
    } catch (e) {
        console.error(`[${EXTENSION_NAME}] 隐藏楼层失败:`, e);
        return false;
    }
}

/**
 * 取消隐藏指定范围的楼层
 */
async function unhideFloors(start, end) {
    try {
        const context = getContext();
        if (!context || !context.chat) {
            toastr.error('无法获取聊天上下文');
            return false;
        }

        const startNum = parseInt(start);
        const endNum = parseInt(end);

        for (let i = startNum; i <= endNum; i++) {
            if (context.chat[i]) {
                context.chat[i].is_system = false;
                context.chat[i].is_hidden = false;
            }
        }

        await context.saveChat();
        console.log(`[${EXTENSION_NAME}] 已取消隐藏楼层 ${startNum} ~ ${endNum}`);
        return true;
    } catch (e) {
        console.error(`[${EXTENSION_NAME}] 取消隐藏楼层失败:`, e);
        return false;
    }
}

/**
 * 加载指定楼层的消息内容
 */
function loadFloorMessage(floor) {
    try {
        const context = getContext();
        if (!context || !context.chat) {
            return null;
        }

        const floorNum = parseInt(floor);
        if (context.chat[floorNum]) {
            return context.chat[floorNum].mes || '';
        }
        return null;
    } catch (e) {
        console.error(`[${EXTENSION_NAME}] 加载楼层消息失败:`, e);
        return null;
    }
}

/**
 * 更新指定楼层的消息内容
 */
async function updateFloorMessage(floor, content) {
    try {
        const context = getContext();
        if (!context || !context.chat) {
            toastr.error('无法获取聊天上下文');
            return false;
        }

        const floorNum = parseInt(floor);
        if (context.chat[floorNum]) {
            context.chat[floorNum].mes = content;
            await context.saveChat();
            console.log(`[${EXTENSION_NAME}] 已更新楼层 ${floorNum} 的消息`);
            return true;
        }
        return false;
    } catch (e) {
        console.error(`[${EXTENSION_NAME}] 更新楼层消息失败:`, e);
        return false;
    }
}

/**
 * 加载配置到UI
 */
function loadConfigToUI() {
    const config = loadConfig();

    const fields = {
        'xgj_hide_start': config.hideStart,
        'xgj_hide_end': config.hideEnd,
        'xgj_unhide_start': config.unhideStart,
        'xgj_unhide_end': config.unhideEnd,
        'xgj_floor_number': config.floorNumber,
        'xgj_floor_content': config.floorContent,
        'xgj_retry_interval': config.retryInterval,
        'xgj_max_retries': config.maxRetries,
        'xgj_init_delay': config.initDelay
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) {
            el.value = value || '';
        }
    }

    console.log(`[${EXTENSION_NAME}] 配置已加载到UI`);
}

/**
 * 创建设置面板
 */
function createSettingsPanel(parent) {
    const html = `
<div class="inline-drawer xgj-settings">
    <div class="inline-drawer-toggle inline-drawer-header">
        <b>小工具</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
    </div>

    <div class="inline-drawer-content" style="display: none;">

        <!-- 隐藏楼层 -->
        <div class="marginBot5">
        
        <div class="flex-container marginBot5">
            <label class="flex1">隐藏</label>
            <input id="xgj_hide_start" class="text_pole" type="text" style="width: 60px; text-align: center;" placeholder="0">
            <span style="margin: 0 5px; line-height: 30px;">~</span>
            <input id="xgj_hide_end" class="text_pole" type="text" style="width: 60px; text-align: center;" placeholder="0">
            <span style="margin-left: 5px; line-height: 30px;">层楼</span>
            <div id="xgj_hide_apply" class="menu_button menu_button_icon" style="margin-left: 10px;">
                <span>立即应用</span>
            </div>
        </div>

        <!-- 取消隐藏楼层 -->
        <div class="marginBot5">
        
        <div class="flex-container marginBot5">
            <label class="flex1">取消隐藏</label>
            <input id="xgj_unhide_start" class="text_pole" type="text" style="width: 60px; text-align: center;" placeholder="0">
            <span style="margin: 0 5px; line-height: 30px;">~</span>
            <input id="xgj_unhide_end" class="text_pole" type="text" style="width: 60px; text-align: center;" placeholder="0">
            <span style="margin-left: 5px; line-height: 30px;">层楼</span>
            <div id="xgj_unhide_apply" class="menu_button menu_button_icon" style="margin-left: 10px;">
                <span>立即应用</span>
            </div>
        </div>

        <hr class="sysHR">

        <!-- 楼层消息编辑 -->
        <div class="marginBot5">
            <label class="text_pole"><b>楼层消息编辑</b></label>
        </div>
        <div class="marginBot5">
            <textarea id="xgj_floor_content" class="text_pole" style="height: 150px; resize: vertical;" placeholder="显示整个楼层的消息，可以进行输入"></textarea>
        </div>
        <div class="flex-container marginBot5">
            <label class="flex1">加载第</label>
            <input id="xgj_floor_number" class="text_pole" type="text" style="width: 60px; text-align: center;" placeholder="0">
            <span style="margin-left: 5px; line-height: 30px;">层楼消息</span>
            <div id="xgj_load_floor" class="menu_button menu_button_icon" style="margin-left: 10px;">
                <span>加载</span>
            </div>
            <div id="xgj_apply_floor" class="menu_button menu_button_icon" style="margin-left: 10px;">
                <span>立即应用</span>
            </div>
        </div>

        <hr class="sysHR">

        <!-- 初始化设置 -->
        <div class="marginBot5">
            <label class="text_pole"><b>初始化设置</b></label>
        </div>

        <div class="marginBot5" style="font-size: 12px; color: #888;">
            未寻找到扩展菜单时：
        </div>
        <div class="flex-container marginBot5">
            <label class="flex1">每隔</label>
            <input id="xgj_retry_interval" class="text_pole" type="text" style="width: 60px; text-align: center;" placeholder="1000">
            <span style="margin: 0 5px; line-height: 30px;">毫秒重试一次，最多重试</span>
            <input id="xgj_max_retries" class="text_pole" type="text" style="width: 60px; text-align: center;" placeholder="10">
            <span style="margin-left: 5px; line-height: 30px;">次</span>
        </div>

        <div class="marginBot5" style="font-size: 12px; color: #888;">
            已寻找到扩展菜单时：
        </div>
        <div class="flex-container marginBot5">
            <label class="flex1">延迟</label>
            <input id="xgj_init_delay" class="text_pole" type="text" style="width: 60px; text-align: center;" placeholder="0">
            <span style="margin-left: 5px; line-height: 30px;">毫秒进行初始化</span>
        </div>

        <div id="xgj_save_settings" class="menu_button menu_button_icon marginTop5">
            <i class="fa-solid fa-save"></i>
            <span>保存设置</span>
        </div>

    </div>
</div>
`;

    parent.insertAdjacentHTML('beforeend', html);
    loadConfigToUI();
    bindEvents();
    registerSlashCommands();

    console.log(`[${EXTENSION_NAME}] 设置面板创建成功`);
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 隐藏楼层 - 立即应用
    document.getElementById('xgj_hide_apply')?.addEventListener('click', async function() {
        const start = document.getElementById('xgj_hide_start')?.value?.trim();
        const end = document.getElementById('xgj_hide_end')?.value?.trim();

        // 验证是否为数字
        if (!isValidNumber(start) || !isValidNumber(end)) {
            toastr.error('楼层数必须为纯数字');
            return;
        }

        if (!start || !end) {
            toastr.error('请填写起始和结束楼层');
            return;
        }

        // 验证楼层范围
        const validation = validateFloorRange(start, end);
        if (!validation.valid) {
            toastr.error(validation.message);
            return;
        }

        // 执行隐藏
        const success = await hideFloors(start, end);
        if (success) {
            // 保存配置
            saveConfig({ hideStart: start, hideEnd: end });
            loadConfigToUI();
            toastr.success(`已隐藏楼层 ${start} ~ ${end}`);
        } else {
            toastr.error('隐藏楼层失败');
        }
    });

    // 取消隐藏楼层 - 立即应用
    document.getElementById('xgj_unhide_apply')?.addEventListener('click', async function() {
        const start = document.getElementById('xgj_unhide_start')?.value?.trim();
        const end = document.getElementById('xgj_unhide_end')?.value?.trim();

        // 验证是否为数字
        if (!isValidNumber(start) || !isValidNumber(end)) {
            toastr.error('楼层数必须为纯数字');
            return;
        }

        if (!start || !end) {
            toastr.error('请填写起始和结束楼层');
            return;
        }

        // 验证楼层范围
        const validation = validateFloorRange(start, end);
        if (!validation.valid) {
            toastr.error(validation.message);
            return;
        }

        // 执行取消隐藏
        const success = await unhideFloors(start, end);
        if (success) {
            // 保存配置
            saveConfig({ unhideStart: start, unhideEnd: end });
            loadConfigToUI();
            toastr.success(`已取消隐藏楼层 ${start} ~ ${end}`);
        } else {
            toastr.error('取消隐藏楼层失败');
        }
    });

    // 加载楼层消息
    document.getElementById('xgj_load_floor')?.addEventListener('click', function() {
        const floor = document.getElementById('xgj_floor_number')?.value?.trim();

        // 验证是否为数字
        if (!isValidNumber(floor)) {
            toastr.error('楼层数必须为纯数字');
            return;
        }

        if (!floor) {
            toastr.error('请填写楼层数');
            return;
        }

        // 验证楼层
        const validation = validateSingleFloor(floor);
        if (!validation.valid) {
            toastr.error(validation.message);
            return;
        }

        // 加载消息
        const content = loadFloorMessage(floor);
        if (content !== null) {
            document.getElementById('xgj_floor_content').value = content;
            saveConfig({ floorNumber: floor, floorContent: content });
            loadConfigToUI();
            toastr.success(`已加载楼层 ${floor} 的消息`);
        } else {
            toastr.error('加载楼层消息失败');
        }
    });

    // 应用楼层消息修改
    document.getElementById('xgj_apply_floor')?.addEventListener('click', async function() {
        const floor = document.getElementById('xgj_floor_number')?.value?.trim();
        const content = document.getElementById('xgj_floor_content')?.value || '';

        // 验证是否为数字
        if (!isValidNumber(floor)) {
            toastr.error('楼层数必须为纯数字');
            return;
        }

        if (!floor) {
            toastr.error('请填写楼层数');
            return;
        }

        // 验证楼层
        const validation = validateSingleFloor(floor);
        if (!validation.valid) {
            toastr.error(validation.message);
            return;
        }

        // 更新消息
        const success = await updateFloorMessage(floor, content);
        if (success) {
            saveConfig({ floorNumber: floor, floorContent: content });
            loadConfigToUI();
            toastr.success(`已更新楼层 ${floor} 的消息`);
        } else {
            toastr.error('更新楼层消息失败');
        }
    });

    // 保存设置
    document.getElementById('xgj_save_settings')?.addEventListener('click', function() {
        const retryInterval = document.getElementById('xgj_retry_interval')?.value?.trim();
        const maxRetries = document.getElementById('xgj_max_retries')?.value?.trim();
        const initDelay = document.getElementById('xgj_init_delay')?.value?.trim();

        // 验证是否为数字
        if (!isValidNumber(retryInterval)) {
            toastr.error('重试间隔必须为纯数字');
            return;
        }
        if (!isValidNumber(maxRetries)) {
            toastr.error('最大重试次数必须为纯数字');
            return;
        }
        if (!isValidNumber(initDelay)) {
            toastr.error('初始化延迟必须为纯数字');
            return;
        }

        // 保存配置
        const success = saveConfig({
            retryInterval: retryInterval || '1000',
            maxRetries: maxRetries || '10',
            initDelay: initDelay || '0'
        });

        if (success) {
            loadConfigToUI();
            toastr.success('设置已保存');
        } else {
            toastr.error('保存设置失败');
        }
    });

    console.log(`[${EXTENSION_NAME}] 事件绑定完成`);
}

/**
 * 注册斜杠命令
 */
function registerSlashCommands() {
    try {
        // 注册 /hide 命令
        SlashCommandParser.addCommandObject({
            name: 'hide',
            callback: async (namedArgs, unnamedArgs) => {
                const args = String(unnamedArgs).trim().split(/\s+/);
                if (args.length < 2) {
                    return '用法: /hide <起始楼层> <结束楼层>';
                }

                const start = args[0];
                const end = args[1];

                if (!isValidNumber(start) || !isValidNumber(end)) {
                    return '错误: 楼层数必须为纯数字';
                }

                const validation = validateFloorRange(start, end);
                if (!validation.valid) {
                    return `错误: ${validation.message}`;
                }

                const success = await hideFloors(start, end);
                if (success) {
                    return `已隐藏楼层 ${start} ~ ${end}`;
                } else {
                    return '隐藏楼层失败';
                }
            },
            helpString: '隐藏指定范围的楼层。用法: /hide <起始楼层> <结束楼层>',
        });

        // 注册 /unhide 命令
        SlashCommandParser.addCommandObject({
            name: 'unhide',
            callback: async (namedArgs, unnamedArgs) => {
                const args = String(unnamedArgs).trim().split(/\s+/);
                if (args.length < 2) {
                    return '用法: /unhide <起始楼层> <结束楼层>';
                }

                const start = args[0];
                const end = args[1];

                if (!isValidNumber(start) || !isValidNumber(end)) {
                    return '错误: 楼层数必须为纯数字';
                }

                const validation = validateFloorRange(start, end);
                if (!validation.valid) {
                    return `错误: ${validation.message}`;
                }

                const success = await unhideFloors(start, end);
                if (success) {
                    return `已取消隐藏楼层 ${start} ~ ${end}`;
                } else {
                    return '取消隐藏楼层失败';
                }
            },
            helpString: '取消隐藏指定范围的楼层。用法: /unhide <起始楼层> <结束楼层>',
        });

        console.log(`[${EXTENSION_NAME}] 斜杠命令注册成功`);
    } catch (e) {
        console.error(`[${EXTENSION_NAME}] 注册斜杠命令失败:`, e);
    }
}

/**
 * 查找扩展菜单并初始化
 */
function findAndInit() {
    // 加载配置
    const config = loadConfig();
    const retryInterval = parseInt(config.retryInterval) || 1000;
    const maxRetries = parseInt(config.maxRetries) || 10;
    const initDelay = parseInt(config.initDelay) || 0;

    let attempts = 0;

    function tryFind() {
        attempts++;
        const element = document.getElementById('extensions_settings');

        if (element) {
            console.log(`[${EXTENSION_NAME}] 已找到扩展设置菜单，延迟 ${initDelay} 毫秒后初始化`);

            if (initDelay > 0) {
                setTimeout(() => {
                    createSettingsPanel(element);
                }, initDelay);
            } else {
                createSettingsPanel(element);
            }
        } else {
            if (attempts < maxRetries) {
                console.log(`[${EXTENSION_NAME}] 未找到扩展菜单，${retryInterval}ms 后重试 (${attempts}/${maxRetries})`);
                setTimeout(tryFind, retryInterval);
            } else {
                console.error(`[${EXTENSION_NAME}] 已达到最大重试次数(${maxRetries})，初始化失败`);
            }
        }
    }

    tryFind();
}

// 导入模块
import { getContext } from '/scripts/extensions.js';
import { SlashCommandParser } from '/scripts/slash-commands/SlashCommandParser.js';

// 启动初始化
findAndInit();