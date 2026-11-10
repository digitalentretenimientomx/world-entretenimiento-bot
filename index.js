require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_ID = 1120012272;
const PRODUCTS_FILE = './products.json';
const USERS_FILE = './users.json';
const GUIDES_FILE = './guides.json';

const adminState = {};
const clientState = {};

function getProducts() {
    if (!fs.existsSync(PRODUCTS_FILE)) {
        const initialProducts = [
            { 
                id: 'capcut', 
                name: '🎬 CapCut Pro 30 Days', 
                entities: [],
                price: '1.82 USDT', 
                durationDays: 30,
                isProfile: false,
                stock: ['correo1@gmail.com:pass123'] 
            }
        ];
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(initialProducts, null, 2));
        return initialProducts;
    }
    try {
        const data = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
        return data.map(p => ({
            ...p,
            entities: p.entities || [],
            durationDays: p.durationDays || 30,
            isProfile: p.isProfile || false,
            stock: Array.isArray(p.stock) ? p.stock : []
        }));
    } catch (e) {
        return [];
    }
}

function saveProducts(products) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

function getUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getGuides() {
    if (!fs.existsSync(GUIDES_FILE)) {
        const initialGuides = {
            netflix: { title: '📺 Guía de Netflix', content: '1. Entra a Netflix.\n2. Usa tu correo, perfil y PIN asignado.\n3. Disfruta.' },
            capcut: { title: '🎬 Guía de CapCut Pro', content: '1. Abre CapCut.\n2. Inicia sesión con la cuenta.\n3. Edita sin marca de agua.' }
        };
        fs.writeFileSync(GUIDES_FILE, JSON.stringify(initialGuides, null, 2));
        return initialGuides;
    }
    try {
        return JSON.parse(fs.readFileSync(GUIDES_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveGuides(guides) {
    fs.writeFileSync(GUIDES_FILE, JSON.stringify(guides, null, 2));
}

function getUserData(userId, firstName = 'Usuario') {
    const users = getUsers();
    if (!users[userId]) {
        const fechaActual = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        users[userId] = { 
            name: firstName,
            joinDate: fechaActual,
            balance: 0, 
            purchases: [],
            history: []
        };
        saveUsers(users);
    } else {
        if (!users[userId].joinDate) {
            users[userId].joinDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        if (!users[userId].history) {
            users[userId].history = [];
        }
        saveUsers(users);
    }
    return users[userId];
}

bot.start((ctx) => {
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || 'Usuario';
    getUserData(userId, firstName);

    let keyboard = [
        ['🛒 Catálogo', '📦 Mis Compras'],
        ['💳 Mi Saldo', '👤 Mi Perfil'],
        ['🔄 Renovar', '📜 Historial'],
        ['📖 Guías de Uso', '🔑 Solicitar Código'],
        ['🛠️ Soporte Técnico', '🛠️ Soporte al Cliente']
    ];

    if (userId === ADMIN_ID) {
        keyboard.push(['⚙️ Administrar Productos']);
    }

    ctx.reply(
        '🚀 <b>Bienvenido a World Entretenimiento</b>\n\nSelecciona una opción del menú principal:',
        {
            parse_mode: 'HTML',
            ...Markup.keyboard(keyboard).resize()
        }
    );
});

// --- BOTÓN: 👤 MI PERFIL ---
bot.hears('👤 Mi Perfil', (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId, ctx.from.first_name);

    const totalPedidos = userData.purchases ? userData.purchases.length : 0;
    const totalGastado = userData.purchases ? userData.purchases.reduce((acc, p) => {
        const val = parseFloat(String(p.price || '0').replace(/[^0-9.]/g, '')) || 0;
        return acc + val;
    }, 0) : 0;

    const perfilCard = 
        `<b>👤 PANEL DE PERFIL</b>\n` +
        `──────────────────\n` +
        `🌐 <b>Cliente:</b> ${userData.name}\n` +
        `🆔 <b>ID:</b> <code>${userId}</code>\n` +
        `📅 <b>Miembro desde:</b> ${userData.joinDate}\n` +
        `👛 <b>Saldo actual:</b> <code>${userData.balance.toFixed(2)} USDT</code>\n` +
        `──────────────────\n` +
        `📦 <b>Pedidos totales:</b> ${totalPedidos}\n` +
        `💰 <b>Total gastado:</b> <code>${totalGastado.toFixed(2)} USDT</code>`;

    ctx.reply(perfilCard, { parse_mode: 'HTML' });
});

// --- BOTÓN: 📦 MIS COMPRAS ---
bot.hears('📦 Mis Compras', (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId, ctx.from.first_name);

    if (!userData.purchases || userData.purchases.length === 0) {
        return ctx.reply('📦 No tienes productos activos o compras registradas en este momento.');
    }

    let mensaje = '📦 <b>TUS COMPRAS Y SERVICIOS ACTIVOS</b>\n────────────────────────\n\n';
    const ahora = Date.now();

    userData.purchases.forEach((p, index) => {
        const fechaVencStr = new Date(p.expirationDate).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const activo = p.expirationDate > ahora ? '🟢 <b>ACTIVO</b>' : '🔴 <b>VENCIDO</b>';

        mensaje += `<b>${index + 1}. ${p.productName}</b>\n` +
                   `• Estado: ${activo}\n` +
                   `• Acceso: <code>${p.email}</code>\n` +
                   (p.profileName ? `• Perfil: <b>${p.profileName}</b>\n` : '') +
                   (p.profilePin ? `• PIN: <code>${p.profilePin}</code>\n` : '') +
                   `• Vencimiento: <b>${fechaVencStr}</b>\n\n`;
    });

    ctx.reply(mensaje, { parse_mode: 'HTML' });
});

// --- BOTÓN: 📜 HISTORIAL ---
bot.hears('📜 Historial', (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId, ctx.from.first_name);

    if (!userData.history || userData.history.length === 0) {
        return ctx.reply('📜 No tienes transacciones registradas en tu historial.');
    }

    let mensaje = '📜 <b>HISTORIAL DE TRANSACCIONES</b>\n────────────────────────\n\n';
    userData.history.forEach((h, index) => {
        mensaje += `<b>${index + 1}. [${h.tipo}]</b>\n` +
                   `• Detalle: ${h.detalle}\n` +
                   `• Monto: <b>${h.monto}</b>\n` +
                   `• Fecha: ${h.fecha}\n\n`;
    });

    ctx.reply(mensaje, { parse_mode: 'HTML' });
});

// --- BOTÓN: 📖 GUÍAS DE USO (Dinámicas) ---
bot.hears('📖 Guías de Uso', (ctx) => {
    const guides = getGuides();
    const keys = Object.keys(guides);

    if (keys.length === 0) {
        return ctx.reply('📖 No hay guías de uso disponibles en este momento.');
    }

    const buttons = keys.map(key => [Markup.button.callback(guides[key].title, `show_guide_${key}`)]);
    buttons.push([Markup.button.callback('🔙 Volver al Menú', 'cancelar_proceso')]);

    ctx.reply(
        '📖 <b>Centro de Guías y Manuales de Uso</b>\n\nSelecciona el servicio del que necesitas ver las instrucciones:',
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
});

bot.action(/^show_guide_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const guideKey = ctx.match[1];
    const guides = getGuides();
    const guide = guides[guideKey];

    if (!guide) return ctx.reply('❌ Guía no encontrada.');

    ctx.editMessageText(
        `<b>${guide.title}</b>\n\n${guide.content}`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Volver a Guías', 'volver_guias')]
            ])
        }
    );
});

bot.action('volver_guias', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const guides = getGuides();
    const keys = Object.keys(guides);
    const buttons = keys.map(key => [Markup.button.callback(guides[key].title, `show_guide_${key}`)]);
    buttons.push([Markup.button.callback('🔙 Volver al Menú', 'cancelar_proceso')]);

    ctx.editMessageText(
        '📖 <b>Centro de Guías y Manuales de Uso</b>\n\nSelecciona el servicio del que necesitas ver las instrucciones:',
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
});

// --- BOTÓN: 🔑 SOLICITAR CÓDIGO ---
bot.hears('🔑 Solicitar Código', (ctx) => {
    const products = getProducts();
    if (products.length === 0) return ctx.reply('⚠️ No hay plataformas configuradas.');

    const buttons = products.map(p => [Markup.button.callback(p.name, `req_code_prod_${p.id}`)]);
    buttons.push([Markup.button.callback('🔙 Volver', 'cancelar_proceso')]);

    ctx.reply(
        '🔑 <b>Solicitud de Código / Enlace de Acceso</b>\n\nSelecciona la plataforma para la cual necesitas solicitar ayuda:',
        { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
    );
});

bot.action(/^req_code_prod_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const productId = ctx.match[1];
    const products = getProducts();
    const product = products.find(p => p.id === productId);

    if (!product) return ctx.reply('❌ Plataforma no encontrada.');

    const userId = ctx.from.id;
    clientState[userId] = { platform: product.name };

    ctx.editMessageText(
        `🔑 Plataforma seleccionada: <b>${product.name}</b>\n\nSelecciona el motivo de tu solicitud:`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔗 Enlace de inicio Netflix', 'req_reason_enlacenetflix')],
                [Markup.button.callback('🔢 Código de 6 dígitos Netflix', 'req_reason_6digits')],
                [Markup.button.callback('🏠 Inicio', 'req_reason_inicio')],
                [Markup.button.callback('✈️ Estoy de viaje', 'req_reason_viaje')],
                [Markup.button.callback('🔄 Actualización de hogar', 'req_reason_hogar')],
                [Markup.button.callback('🔙 Volver', 'cancelar_proceso')]
            ])
        }
    );
});

bot.action(/^req_reason_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const reasonKey = ctx.match[1];
    const reasonsMap = {
        enlacenetflix: 'Enlace de inicio Netflix',
        '6digits': 'Código de 6 dígitos Netflix',
        inicio: 'Inicio',
        viaje: 'Estoy de viaje',
        hogar: 'Actualización de hogar'
    };
    const motivo = reasonsMap[reasonKey] || 'General';
    const userId = ctx.from.id;

    if (!clientState[userId]) clientState[userId] = {};
    clientState[userId].reason = motivo;

    ctx.editMessageText(
        `🔑 Motivo seleccionado: <b>${motivo}</b>\n\n¿Deseas enviar la solicitud al administrador ahora?`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Enviar Solicitud', 'enviar_solicitud_codigo')],
                [Markup.button.callback('🔙 Cancelar', 'cancelar_proceso')]
            ])
        }
    );
});

bot.action('enviar_solicitud_codigo', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const userId = ctx.from.id;
    const state = clientState[userId] || {};
    const plataforma = state.platform || 'Desconocida';
    const motivo = state.reason || 'General';

    delete clientState[userId];

    ctx.editMessageText('✅ <b>¡Solicitud enviada!</b> El administrador ha recibido tu petición y te responderá en breve.', { parse_mode: 'HTML' });

    bot.telegram.sendMessage(
        ADMIN_ID,
        `🔑 <b>Nueva Solicitud de Código / Enlace</b>\n\n` +
        `👤 Usuario ID: <code>${userId}</code>\n` +
        `📺 Plataforma: <b>${plataforma}</b>\n` +
        `📌 Motivo: <b>${motivo}</b>`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💬 Enviar Respuesta al Cliente', `responder_codigo_${userId}`)]
            ])
        }
    );
});

bot.action(/^responder_codigo_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch (e) {}
    adminState[ADMIN_ID] = { step: 'waiting_code_reply', targetUserId: Number(ctx.match[1]) };
    ctx.reply('✍️ Escribe el <b>enlace, código o mensaje</b> que se enviará al cliente:', { parse_mode: 'HTML' });
});

// --- BOTÓN: 🛠️ SOPORTE TÉCNICO ---
bot.hears('🛠️ Soporte Técnico', (ctx) => {
    const userId = ctx.from.id;
    clientState[userId] = { step: 'waiting_support_account' };

    ctx.reply(
        '🛠️ <b>Centro de Soporte Técnico</b>\n\nPor favor, ingresa los <b>datos de la cuenta</b> (correo y/o perfil) con la que tienes el problema:',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Volver al Menú', 'cancelar_proceso')]
            ])
        }
    );
});

// --- BOTÓN: 🛠️ SOPORTE AL CLIENTE ---
bot.hears('🛠️ Soporte al Cliente', (ctx) => {
    const userId = ctx.from.id;
    clientState[userId] = { step: 'support_menu' };

    ctx.reply(
        '🛠️ <b>Centro de Soporte al Cliente</b>\n\nSelecciona el tipo de ayuda que necesitas:',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('❌ No puedo ingresar', 'soporte_no_ingresa')],
                [Markup.button.callback('🔑 Ayuda para acceso', 'soporte_ayuda_acceso')],
                [Markup.button.callback('🔙 Volver al Menú', 'cancelar_proceso')]
            ])
        }
    );
});

bot.action('soporte_no_ingresa', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const userId = ctx.from.id;
    clientState[userId] = { step: 'waiting_support_desc', issueType: 'No puedo ingresar' };
    ctx.editMessageText('📝 Por favor, describe brevemente tu problema con detalle para pasarlo a soporte técnico:', { parse_mode: 'HTML' });
});

bot.action('soporte_ayuda_acceso', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const userId = ctx.from.id;
    clientState[userId] = { step: 'waiting_support_desc', issueType: 'Ayuda para acceso' };
    ctx.editMessageText('📝 Por favor, describe brevemente qué inconveniente tienes con tus datos de acceso:', { parse_mode: 'HTML' });
});

// --- RENOVACIÓN Y SALDO ---
bot.hears('🔄 Renovar', (ctx) => {
    const userId = ctx.from.id;
    clientState[userId] = { step: 'waiting_renewal_email' };
    ctx.reply('🔄 <b>Renovación de Servicios</b>\n\nIngresa el <b>correo electrónico</b> de la cuenta que deseas renovar:', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Volver al Menú', 'cancelar_proceso')]])
    });
});

bot.hears('💳 Mi Saldo', (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId, ctx.from.first_name);
    ctx.reply(
        `💳 <b>Tu Saldo Actual:</b> <code>${userData.balance.toFixed(2)} USDT</code>\n\n¿Qué acción deseas realizar?`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('➕ Recargar Saldo', 'recargar_saldo')],
                [Markup.button.callback('🔙 Volver al Menú', 'cancelar_proceso')]
            ])
        }
    );
});

bot.action('recargar_saldo', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const userId = ctx.from.id;
    clientState[userId] = { step: 'waiting_amount' };
    ctx.reply('✍️ Escribe la cantidad en <b>USDT</b> que deseas recargar (Ej: 5, 10, 20):', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Volver al Menú', 'cancelar_proceso')]])
    });
});

async function mostrarDatosPago(ctx, userId, monto) {
    clientState[userId].amount = monto;
    clientState[userId].step = 'waiting_order_id';
    const payIdBinance = "985361383 (andyworld)";
    await ctx.reply(
        `📌 <b>Pago con Binance</b>\n` +
        `💳 ID de pago: <code>${payIdBinance}</code>\n\n` +
        `💰 <b>Monto:</b> <code>${monto.toFixed(2)} USDT</code>\n\n` +
        `Presiona abajo para confirmar tu pago:`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Confirmar Pago', 'confirmar_pago_step')],
                [Markup.button.callback('🔙 Volver al Menú', 'cancelar_proceso')]
            ])
        }
    );
}

bot.action('confirmar_pago_step', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const userId = ctx.from.id;
    if (!clientState[userId]) clientState[userId] = {};
    clientState[userId].step = 'waiting_order_id';
    ctx.reply('✍️ Ingresa el <b>ID de la orden o transacción</b> de tu pago:', { parse_mode: 'HTML' });
});

bot.action('cancelar_proceso', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    delete clientState[ctx.from.id];
    delete adminState[ctx.from.id];
    ctx.reply('🔙 Operación cancelada. Selecciona una opción del menú principal.');
});

// --- CATÁLOGO (CON ENCABEZADO ORDENADO ARRIBA) ---
bot.hears('🛒 Catálogo', async (ctx) => {
    const products = getProducts();
    if (products.length === 0) {
        return ctx.reply('🛍️ <b>Catálogo:</b> No hay productos registrados.', { parse_mode: 'HTML' });
    }

    // 1. Enviamos primero el encabezado asegurando que aparezca arriba
    await ctx.reply('🛍️ <b>Catálogo de Servicios y Cuentas Disponibles:</b>', { parse_mode: 'HTML' });

    // 2. Iteramos los productos debajo de manera sincronizada
    for (const p of products) {
        const stockCount = p.stock ? p.stock.length : 0;
        let stockEstado = stockCount > 0 ? `🟢 ${stockCount} disponibles` : `🔴 AGOTADO`;
        const textoProducto = `${p.name} — ${p.price}\nStock: ${stockEstado}` + (p.isProfile ? `\n📌 <i>Incluye Perfil y PIN</i>` : '');

        if (p.entities && p.entities.length > 0) {
            await ctx.reply(textoProducto, {
                parse_mode: undefined,
                entities: p.entities,
                ...Markup.inlineKeyboard([[Markup.button.callback('🛒 Comprar Ahora', `buy_${p.id}`)]])
            });
        } else {
            await ctx.reply(textoProducto, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback('🛒 Comprar Ahora', `buy_${p.id}`)]])
            });
        }
    }
});

bot.action(/^buy_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const userId = ctx.from.id;
    const productId = ctx.match[1];
    const products = getProducts();
    const product = products.find(prod => prod.id === productId);

    if (!product || !product.stock || product.stock.length === 0) {
        return ctx.reply('❌ Lo sentimos, este producto se encuentra <b>agotado</b>.', { parse_mode: 'HTML' });
    }

    const precioNumerico = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;
    const userData = getUserData(userId, ctx.from.first_name);

    if (userData.balance < precioNumerico) {
        return ctx.reply(
            `❌ <b>Saldo Insuficiente</b>\n\nCuesta <b>${product.price}</b> y tu saldo es <code>${userData.balance.toFixed(2)} USDT</code>.`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback('➕ Recargar Saldo', 'recargar_saldo')]])
            }
        );
    }

    userData.balance -= precioNumerico;
    const deliveredItem = product.stock.shift(); 
    saveProducts(products); 

    let emailAcceso = deliveredItem;
    let perfilNombre = null;
    let perfilPin = null;

    if (product.isProfile) {
        const partes = deliveredItem.split('|');
        emailAcceso = partes[0] || deliveredItem;
        perfilNombre = partes[1] || 'Perfil Asignado';
        perfilPin = partes[2] || 'Sin PIN';
    }

    const diasVigencia = product.durationDays || 30;
    const fechaCompra = new Date();
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaCompra.getDate() + diasVigencia);

    userData.purchases.push({
        email: emailAcceso,
        profileName: perfilNombre,
        profilePin: perfilPin,
        productName: product.name,
        price: product.price,
        durationDays: diasVigencia,
        expirationDate: fechaVencimiento.getTime(),
        notified: false
    });

    userData.history.push({
        tipo: 'COMPRA',
        detalle: product.name,
        monto: product.price,
        fecha: fechaCompra.toLocaleDateString('es-MX')
    });

    const users = getUsers();
    users[userId] = userData;
    saveUsers(users);

    let mensajeExito = `✅ <b>¡Compra Exitosa!</b>\n\n` +
                       `Servicio: ${product.name}\n` +
                       `Precio pagado: ${product.price}\n` +
                       `💳 Nuevo saldo: <code>${userData.balance.toFixed(2)} USDT</code>\n\n` +
                       `🔑 <b>Datos de Acceso:</b>\n` +
                       `<code>${emailAcceso}</code>\n`;

    if (product.isProfile) {
        mensajeExito += `👤 Perfil: <b>${perfilNombre}</b>\n` +
                        `🔒 PIN: <code>${perfilPin}</code>\n`;
    }

    mensajeExito += `\n📅 <b>Vigencia:</b> ${fechaVencimiento.toLocaleDateString('es-MX')} (${diasVigencia} days)`;

    ctx.reply(mensajeExito, { parse_mode: 'HTML' });
});

// --- PANEL DE ADMINISTRACIÓN ---
bot.hears('⚙️ Administrar Productos', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply(
        '⚙️ <b>Panel de Administración</b>\n\nSelecciona una herramienta:',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('➕ Agregar Producto', 'admin_add'), Markup.button.callback('📋 Gestionar Stock', 'admin_list')],
                [Markup.button.callback('📖 Gestionar Guías', 'admin_guides'), Markup.button.callback('🎁 Asignar Manual', 'admin_manual_assign')]
            ])
        }
    );
});

bot.action('admin_guides', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    ctx.reply(
        '📖 <b>Gestión de Guías de Uso</b>\n\n¿Qué deseas hacer?',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('➕ Agregar Nueva Guía', 'guide_add')],
                [Markup.button.callback('📋 Editar / Borrar Guía', 'guide_list')]
            ])
        }
    );
});

bot.action('guide_add', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    adminState[ADMIN_ID] = { step: 'waiting_guide_key' };
    ctx.reply('✍️ Escribe una <b>clave corta</b> para la guía (Ej: <i>disney</i>, <i>hbomax</i> sin espacios):', { parse_mode: 'HTML' });
});

bot.action('guide_list', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const guides = getGuides();
    const keys = Object.keys(guides);
    if (keys.length === 0) return ctx.reply('No hay guías registradas.');

    const buttons = keys.map(k => [
        Markup.button.callback(`✏️ ${guides[k].title}`, `edit_guide_${k}`),
        Markup.button.callback('❌ Borrar', `del_guide_${k}`)
    ]);
    ctx.reply('📋 Selecciona la guía a modificar:', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
});

bot.action(/^edit_guide_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const gKey = ctx.match[1];
    adminState[ADMIN_ID] = { step: 'waiting_guide_new_content', guideKey: gKey };
    ctx.reply(`✍️ Envía el <b>nuevo contenido completo</b> para esta guía:`, { parse_mode: 'HTML' });
});

bot.action(/^del_guide_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const gKey = ctx.match[1];
    const guides = getGuides();
    delete guides[gKey];
    saveGuides(guides);
    ctx.reply('✅ Guía eliminada.');
});

bot.action('admin_manual_assign', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    adminState[ADMIN_ID] = { step: 'waiting_manual_userid' };
    ctx.reply('✍️ Envía el <b>ID de Telegram</b> del cliente:', { parse_mode: 'HTML' });
});

bot.action('admin_list', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const products = getProducts();
    if (products.length === 0) return ctx.reply('No hay productos registrados.');
    const buttons = products.map(p => [
        Markup.button.callback(`✏️ ${p.name.substring(0, 12)}`, `edit_${p.id}`),
        Markup.button.callback('❌ Borrar', `del_${p.id}`)
    ]);
    ctx.reply('📋 <b>Inventario actual:</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
});

bot.action(/^edit_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const productId = ctx.match[1];
    adminState[ADMIN_ID] = { step: 'editing_product_choice', productId };
    ctx.reply(
        '✏️ ¿Qué deseas editar?',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📝 Nombre', `edname_${productId}`), Markup.button.callback('💰 Precio', `edprice_${productId}`)],
                [Markup.button.callback('⏱️ Días', `eddays_${productId}`), Markup.button.callback('🔑 Stock', `edstock_${productId}`)]
            ])
        }
    );
});

bot.action(/^edname_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    adminState[ADMIN_ID] = { step: 'waiting_new_name', productId: ctx.match[1] };
    ctx.reply('✍️ Escribe el <b>nuevo nombre</b>:', { parse_mode: 'HTML' });
});

bot.action(/^edprice_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    adminState[ADMIN_ID] = { step: 'waiting_new_price', productId: ctx.match[1] };
    ctx.reply('✍️ Escribe el <b>nuevo precio</b>:', { parse_mode: 'HTML' });
});

bot.action(/^eddays_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    adminState[ADMIN_ID] = { step: 'waiting_new_days', productId: ctx.match[1] };
    ctx.reply('✍️ Escribe la <b>duración en días</b>:', { parse_mode: 'HTML' });
});

bot.action(/^edstock_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const productId = ctx.match[1];
    const products = getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return ctx.reply('⚠️ Producto no encontrado.');

    ctx.reply(
        `🔑 <b>Gestión de Stock para: ${prod.name}</b>\n\nSelecciona qué deseas hacer con el stock:`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('➕ Agregar más stock', `addstock_${productId}`)],
                [Markup.button.callback('🗑️ Eliminar un correo / cuenta específica', `delstock_list_${productId}`)],
                [Markup.button.callback('🔙 Volver', 'admin_list')]
            ])
        }
    );
});

bot.action(/^addstock_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const productId = ctx.match[1];
    adminState[ADMIN_ID] = { step: 'waiting_add_more_stock', productId };
    ctx.reply('✍️ Envía el <b>nuevo stock</b> que deseas agregar (puedes enviar líneas nuevas):', { parse_mode: 'HTML' });
});

bot.action(/^delstock_list_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const productId = ctx.match[1];
    const products = getProducts();
    const prod = products.find(p => p.id === productId);

    if (!prod || !prod.stock || prod.stock.length === 0) {
        return ctx.reply('⚠️ Este producto no tiene cuentas registradas en el stock.');
    }

    const buttons = prod.stock.map((item, index) => [
        Markup.button.callback(`❌ Eliminar: ${item.substring(0, 25)}`, `del_single_${productId}_${index}`)
    ]);
    buttons.push([Markup.button.callback('🔙 Volver', `edstock_${productId}`)]);

    ctx.reply('🗑️ Selecciona el correo o cuenta específica que deseas <b>eliminar</b> del stock:', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
    });
});

bot.action(/^del_single_(.+)_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const productId = ctx.match[1];
    const indexToDelete = parseInt(ctx.match[2]);

    let products = getProducts();
    const prod = products.find(p => p.id === productId);

    if (prod && prod.stock && prod.stock[indexToDelete] !== undefined) {
        const eliminado = prod.stock.splice(indexToDelete, 1);
        saveProducts(products);
        return ctx.reply(`✅ Cuenta eliminada correctamente del stock:\n<code>${eliminado}</code>`, { parse_mode: 'HTML' });
    }

    ctx.reply('❌ No se pudo encontrar el elemento en el stock.');
});

bot.action(/^del_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    let products = getProducts();
    products = products.filter(p => p.id !== ctx.match[1]);
    saveProducts(products);
    ctx.reply('✅ Producto eliminado.');
});

bot.action('admin_add', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    adminState[ADMIN_ID] = { step: 'waiting_name' };
    ctx.reply('✍️ Escribe el <b>nombre</b> del producto:', { parse_mode: 'HTML' });
});

bot.action('type_general', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    if (adminState[ADMIN_ID]) {
        adminState[ADMIN_ID].isProfile = false;
        adminState[ADMIN_ID].step = 'waiting_stock';
        ctx.reply('Envía las cuentas en formato <b>correo:contraseña</b> (una por renglón):', { parse_mode: 'HTML' });
    }
});

bot.action('type_profile', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    if (adminState[ADMIN_ID]) {
        adminState[ADMIN_ID].isProfile = true;
        adminState[ADMIN_ID].step = 'waiting_stock';
        ctx.reply('Envía los perfiles en formato <b>correo:contraseña | NombrePerfil | PIN</b> (uno por renglón):', { parse_mode: 'HTML' });
    }
});

// --- APROBAR / RECHAZAR RECARGAS ---
bot.action(/^aprobar_recarga_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const targetUserId = Number(ctx.match[1]);
    const users = getUsers();
    if (!users[targetUserId]) users[targetUserId] = { balance: 0, purchases: [], history: [] };
    const montoAcreditar = clientState[targetUserId]?.amount || 5.00;
    users[targetUserId].balance += montoAcreditar;
    if (!users[targetUserId].history) users[targetUserId].history = [];
    users[targetUserId].history.push({
        tipo: 'RECARGA',
        detalle: 'Acreditación saldo USDT',
        monto: `+${montoAcreditar.toFixed(2)} USDT`,
        fecha: new Date().toLocaleDateString('es-MX')
    });
    saveUsers(users);
    ctx.reply(`✅ Recarga aprobada. Acreditados ${montoAcreditar.toFixed(2)} USDT.`);
    bot.telegram.sendMessage(targetUserId, `🎉 <b>¡Recarga aprobada!</b>\nSe acreditaron <code>${montoAcreditar.toFixed(2)} USDT</code>.`, { parse_mode: 'HTML' });
    delete clientState[targetUserId];
});

bot.action(/^rechazar_recarga_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    const targetUserId = Number(ctx.match[1]);
    ctx.reply('❌ Recarga rechazada.');
    bot.telegram.sendMessage(targetUserId, `❌ Tu comprobante de recarga fue rechazado.`);
    delete clientState[targetUserId];
});

bot.action(/^responder_soporte_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch(e){}
    adminState[ADMIN_ID] = { step: 'waiting_support_reply', targetUserId: Number(ctx.match[1]) };
    ctx.reply('✍️ Escribe la <b>respuesta de soporte</b> para el cliente:', { parse_mode: 'HTML' });
});

// --- CAPTURA DE TEXTO GENERAL ---
bot.on(['text', 'photo'], (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    if (text && [
        '🛒 Catálogo', '📦 Mis Compras', '💳 Mi Saldo', 
        '👤 Mi Perfil', '🔄 Renovar', '📜 Historial', 
        '📖 Guías de Uso', '🔑 Solicitar Código', '🛠️ Soporte Técnico', '🛠️ Soporte al Cliente', '⚙️ Administrar Productos'
    ].includes(text)) {
        return;
    }

    if (userId === ADMIN_ID && adminState[ADMIN_ID]) {
        const state = adminState[ADMIN_ID];

        if (state.step === 'waiting_guide_key' && text) {
            state.guideKey = text.trim().toLowerCase();
            state.step = 'waiting_guide_title';
            return ctx.reply('✍️ Ahora escribe el <b>título visible</b> de la guía (Ej: 📺 Guía de Disney+):', { parse_mode: 'HTML' });
        }

        if (state.step === 'waiting_guide_title' && text) {
            state.guideTitle = text.trim();
            state.step = 'waiting_guide_content';
            return ctx.reply('✍️ Ahora escribe el <b>contenido o pasos</b> de la guía:', { parse_mode: 'HTML' });
        }

        if (state.step === 'waiting_guide_content' && text) {
            const guides = getGuides();
            guides[state.guideKey] = { title: state.guideTitle, content: text.trim() };
            saveGuides(guides);
            delete adminState[ADMIN_ID];
            return ctx.reply('✅ ¡Guía de uso guardada y publicada con éxito!');
        }

        if (state.step === 'waiting_guide_new_content' && text) {
            const guides = getGuides();
            if (guides[state.guideKey]) {
                guides[state.guideKey].content = text.trim();
                saveGuides(guides);
            }
            delete adminState[ADMIN_ID];
            return ctx.reply('✅ ¡Guía actualizada con éxito!');
        }

        if (state.step === 'waiting_code_reply' && text) {
            const targetUserId = state.targetUserId;
            delete adminState[ADMIN_ID];
            bot.telegram.sendMessage(targetUserId, `🔑 <b>Respuesta / Enlace de Acceso:</b>\n\n${text.trim()}`, { parse_mode: 'HTML' });
            return ctx.reply('✅ Enlace o código enviado al cliente exitosamente.');
        }

        if (state.step === 'waiting_manual_userid' && text) {
            const targetId = Number(text.trim());
            if (isNaN(targetId)) return ctx.reply('⚠️ Ingresa un ID válido.');
            state.targetUserId = targetId;
            const products = getProducts();
            if (products.length === 0) return ctx.reply('⚠️ No hay productos.');
            const buttons = products.map(p => [Markup.button.callback(`${p.name} (${p.price})`, `manual_prod_${p.id}`)]);
            return ctx.reply('📦 Selecciona el producto a asignar:', Markup.inlineKeyboard(buttons));
        }

        if (state.step === 'waiting_support_reply' && text) {
            const targetUserId = state.targetUserId;
            delete adminState[ADMIN_ID];
            bot.telegram.sendMessage(targetUserId, `🛠️ <b>Respuesta de Soporte:</b>\n\n${text.trim()}`, { parse_mode: 'HTML' });
            return ctx.reply('✅ Respuesta de soporte enviada.');
        }

        if (state.step === 'waiting_add_more_stock' && text) {
            const newItems = text.split('\n').map(i => i.trim()).filter(i => i.length > 0);
            let products = getProducts();
            const prod = products.find(p => p.id === state.productId);
            if (prod) {
                if (!Array.isArray(prod.stock)) prod.stock = [];
                prod.stock.push(...newItems);
                saveProducts(products);
                delete adminState[ADMIN_ID];

                const alertMsg = `🔔 <b>¡Actualización de stock!</b>\n\n` +
                                 `📦 <b>${prod.name}</b> vuelve a estar disponible — <b>${newItems.length} unidad(es) nueva(s)!</b>\n` +
                                 `💵 Precio: <b>${prod.price} c/u</b>\n` +
                                 `📊 Stock total ahora: <b>${prod.stock.length}</b>\n\n` +
                                 `Toca abajo para conseguir el tuyo antes de que se agote.`;

                const users = getUsers();
                for (const uId in users) {
                    bot.telegram.sendMessage(uId, alertMsg, {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([[Markup.button.callback('🛒 Comprar ahora', '🛒 Catálogo')]])
                    }).catch(() => {});
                }

                return ctx.reply(`✅ Se agregaron ${newItems.length} unidades y se notificó a todos los usuarios.`);
            }
            delete adminState[ADMIN_ID];
            return ctx.reply('❌ Producto no encontrado.');
        }

        if (state.step === 'waiting_new_name' && text) {
            let products = getProducts();
            const prod = products.find(p => p.id === state.productId);
            if (prod) {
                prod.name = text.trim();
                prod.entities = ctx.message.entities || [];
                saveProducts(products);
            }
            delete adminState[ADMIN_ID];
            return ctx.reply('✅ Nombre actualizado.');
        }

        if (state.step === 'waiting_new_price' && text) {
            let products = getProducts();
            const prod = products.find(p => p.id === state.productId);
            if (prod) {
                prod.price = text.trim();
                saveProducts(products);
            }
            delete adminState[ADMIN_ID];
            return ctx.reply('✅ Precio actualizado.');
        }

        if (state.step === 'waiting_new_days' && text) {
            let products = getProducts();
            const prod = products.find(p => p.id === state.productId);
            if (prod) {
                prod.durationDays = parseInt(text.trim()) || 30;
                saveProducts(products);
            }
            delete adminState[ADMIN_ID];
            return ctx.reply('✅ Duración actualizada.');
        }

        if (state.step === 'waiting_name' && text) {
            state.name = text.trim();
            state.entities = ctx.message.entities || [];
            state.step = 'waiting_price';
            return ctx.reply('Escribe el <b>precio</b> (Ej: 3.00 USDT):', { parse_mode: 'HTML' });
        }
        if (state.step === 'waiting_price' && text) {
            state.price = text.trim();
            state.step = 'waiting_days';
            return ctx.reply('Escribe la <b>duración en días</b> (Ej: 30):', { parse_mode: 'HTML' });
        }
        if (state.step === 'waiting_days' && text) {
            state.durationDays = parseInt(text.trim()) || 30;
            state.step = 'waiting_type';
            return ctx.reply('¿Qué tipo de producto es?', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🌐 Cuenta Completa General', 'type_general')],
                    [Markup.button.callback('📌 Perfil con PIN (Ej: Netflix)', 'type_profile')]
                ])
            });
        }
        if (state.step === 'waiting_stock' && text) {
            const stockItems = text.split('\n').map(i => i.trim()).filter(i => i.length > 0);
            const products = getProducts();
            
            const existingProduct = products.find(p => p.name.toLowerCase() === state.name.toLowerCase());

            if (existingProduct) {
                if (!Array.isArray(existingProduct.stock)) existingProduct.stock = [];
                existingProduct.stock.push(...stockItems);
                existingProduct.price = state.price;
                existingProduct.durationDays = state.durationDays;
                existingProduct.isProfile = state.isProfile;
                saveProducts(products);
                delete adminState[ADMIN_ID];

                const alertMsg = `🔔 <b>¡Actualización de stock!</b>\n\n` +
                                 `📦 <b>${existingProduct.name}</b> vuelve a estar disponible — <b>${stockItems.length} unidad(es) nueva(s)!</b>\n` +
                                 `💵 Precio: <b>${existingProduct.price} c/u</b>\n` +
                                 `📊 Stock total ahora: <b>${existingProduct.stock.length}</b>\n\n` +
                                 `Toca abajo para conseguir el tuyo antes de que se agote.`;

                const users = getUsers();
                for (const uId in users) {
                    bot.telegram.sendMessage(uId, alertMsg, {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([[Markup.button.callback('🛒 Comprar ahora', '🛒 Catálogo')]])
                    }).catch(() => {});
                }

                return ctx.reply(`✅ Se fusionó el producto existente: se agregaron ${stockItems.length} unidades al stock (Total: ${existingProduct.stock.length}) y se notificó a todos.`);
            } else {
                products.push({
                    id: 'prod_' + Date.now(),
                    name: state.name,
                    entities: state.entities || [],
                    price: state.price,
                    durationDays: state.durationDays,
                    isProfile: state.isProfile,
                    stock: stockItems
                });
                saveProducts(products);
                delete adminState[ADMIN_ID];

                const alertMsg = `🔔 <b>¡Actualización de stock!</b>\n\n` +
                                 `📦 <b>${state.name}</b> ya está disponible — <b>${stockItems.length} unidad(es)!</b>\n` +
                                 `💵 Precio: <b>${state.price} c/u</b>\n` +
                                 `📊 Stock total ahora: <b>${stockItems.length}</b>\n\n` +
                                 `Toca abajo para conseguir el tuyo antes de que se agote.`;

                const users = getUsers();
                for (const uId in users) {
                    bot.telegram.sendMessage(uId, alertMsg, {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([[Markup.button.callback('🛒 Comprar ahora', '🛒 Catálogo')]])
                    }).catch(() => {});
                }

                return ctx.reply(`✅ Nuevo producto agregado con ${stockItems.length} elementos y se notificó a todos los usuarios.`);
            }
        }
    }

    if (clientState[userId]) {
        const clientSt = clientState[userId];

        if (clientSt.step === 'waiting_renewal_email' && text) {
            clientSt.renewalEmail = text.trim();
            const products = getProducts();
            const buttons = products.map(p => [Markup.button.callback(`${p.name} (${p.price})`, `renew_prod_${p.id}`)]);
            buttons.push([Markup.button.callback('🔙 Volver', 'cancelar_proceso')]);
            return ctx.reply('🔄 Selecciona el producto para renovar:', Markup.inlineKeyboard(buttons));
        }

        if (clientSt.step === 'waiting_support_account' && text) {
            clientSt.accountData = text.trim();
            clientSt.step = 'waiting_support_problem';
            return ctx.reply('📝 Perfecto. Ahora describe detalladamente el <b>problema</b> o reporte de tu cuenta:', { parse_mode: 'HTML' });
        }

        if (clientSt.step === 'waiting_support_problem' && text) {
            const accountData = clientSt.accountData;
            const problema = text.trim();
            delete clientState[userId];

            ctx.reply('✅ Tu reporte ha sido enviado a soporte correctamente. Te atenderemos a la brevedad.', { parse_mode: 'HTML' });

            bot.telegram.sendMessage(
                ADMIN_ID,
                `🚨 <b>Reporte de Soporte Técnico</b>\n\n` +
                `👤 Usuario ID: <code>${userId}</code>\n` +
                `📧 Datos de Cuenta: <code>${accountData}</code>\n` +
                `📄 Problema Reportado:\n${problema}`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('💬 Responder Soporte', `responder_soporte_${userId}`)]
                    ])
                }
            );
            return;
        }

        if (clientSt.step === 'waiting_support_desc' && text) {
            const tipoProblema = clientSt.issueType || 'Soporte';
            const descripcion = text.trim();
            delete clientState[userId];

            ctx.reply('✅ Tu caso ha sido enviado a soporte. Te responderemos a la brevedad.', { parse_mode: 'HTML' });

            bot.telegram.sendMessage(
                ADMIN_ID,
                `🛠️ <b>Nuevo Ticket de Soporte</b>\n\n` +
                `👤 Usuario ID: <code>${userId}</code>\n` +
                `📌 Tipo: <b>${tipoProblema}</b>\n` +
                `📄 Descripción:\n${descripcion}`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('💬 Responder Soporte', `responder_soporte_${userId}`)]
                    ])
                }
            );
            return;
        }

        if (clientSt.step === 'waiting_amount' && text) {
            const monto = parseFloat(text.trim());
            if (isNaN(monto) || monto <= 0) return ctx.reply('⚠️ Ingresa una cantidad válida.');
            return mostrarDatosPago(ctx, userId, monto);
        }

        if (clientSt.step === 'waiting_order_id' && text) {
            clientSt.orderId = text.trim();
            clientSt.step = 'waiting_receipt_photo';
            return ctx.reply('📸 Ahora <b>envía la captura (foto)</b> del comprobante:', { parse_mode: 'HTML' });
        }

        if (clientSt.step === 'waiting_receipt_photo' && ctx.message.photo) {
            const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            ctx.reply('⏳ Comprobante recibido. En revisión.');
            bot.telegram.sendPhoto(ADMIN_ID, photoId, {
                caption: `🔔 <b>Nueva Recarga</b>\n👤 ID: <code>${userId}</code>\n💰 Monto: <code>${clientSt.amount.toFixed(2)} USDT</code>\n🆔 Orden: <code>${clientSt.orderId}</code>`,
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[
                    Markup.button.callback('✅ Aprobar', `aprobar_recarga_${userId}`),
                    Markup.button.callback('❌ Rechazar', `rechazar_recarga_${userId}`)
                ]])
            });
            return;
        }
    }
});

bot.action(/^manual_prod_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    try { await ctx.answerCbQuery(); } catch (e) {}
    const adminData = adminState[ADMIN_ID];
    if (!adminData || !adminData.targetUserId) return ctx.reply('⚠️ Error de sesión.');

    const targetUserId = adminData.targetUserId;
    const product = getProducts().find(p => p.id === ctx.match[1]);
    if (!product || !product.stock || product.stock.length === 0) return ctx.reply('❌ Sin stock.');

    const deliveredItem = product.stock.shift();
    saveProducts(getProducts());

    let emailAcceso = deliveredItem;
    let perfilNombre = null;
    let perfilPin = null;

    if (product.isProfile) {
        const partes = deliveredItem.split('|');
        emailAcceso = partes[0] || deliveredItem;
        perfilNombre = partes[1] || 'Perfil Asignado';
        perfilPin = partes[2] || 'Sin PIN';
    }

    const userData = getUserData(targetUserId, 'Cliente');
    const diasVigencia = product.durationDays || 30;
    const fechaVenc = new Date();
    fechaVenc.setDate(fechaVenc.getDate() + diasVigencia);

    userData.purchases.push({
        email: emailAcceso,
        profileName: perfilNombre,
        profilePin: perfilPin,
        productName: product.name,
        price: '0.00 USDT (Manual)',
        durationDays: diasVigencia,
        expirationDate: fechaVenc.getTime(),
        notified: false
    });
    saveUsers(getUsers());
    delete adminState[ADMIN_ID];

    ctx.reply(`✅ Cuenta asignada al usuario ID: <code>${targetUserId}</code>`, { parse_mode: 'HTML' });

    let msgCliente = `🎁 <b>¡Cuenta asignada por Administración!</b>\n\nServicio: <b>${product.name}</b>\n🔑 Acceso: <code>${emailAcceso}</code>\n`;
    if (product.isProfile) {
        msgCliente += `👤 Perfil: <b>${perfilNombre}</b>\n🔒 PIN: <code>${perfilPin}</code>\n`;
    }
    msgCliente += `\n📅 Válido hasta: ${fechaVenc.toLocaleDateString('es-MX')}`;

    bot.telegram.sendMessage(targetUserId, msgCliente, { parse_mode: 'HTML' }).catch(() => {});
});

bot.action(/^renew_prod_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const userId = ctx.from.id;
    const product = getProducts().find(prod => prod.id === ctx.match[1]);
    if (!product) return ctx.reply('❌ No encontrado.');

    const precioNum = parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0;
    const userData = getUserData(userId, ctx.from.first_name);

    if (userData.balance < precioNum) {
        return ctx.reply(`❌ Saldo insuficiente. Cuesta <b>${product.price}</b>.`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('➕ Recargar', 'recargar_saldo')]])
        });
    }

    userData.balance -= precioNum;
    const dias = product.durationDays || 30;
    const nuevaFecha = new Date();
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);

    userData.history.push({
        tipo: 'RENOVACIÓN',
        detalle: product.name,
        monto: product.price,
        fecha: new Date().toLocaleDateString('es-MX')
    });
    saveUsers(getUsers());
    delete clientState[userId];

    ctx.reply(
        `✅ <b>¡Renovación Exitosa!</b>\nServicio: ${product.name}\n💳 Nuevo saldo: <code>${userData.balance.toFixed(2)} USDT</code>\n📅 Válido hasta: <b>${nuevaFecha.toLocaleDateString('es-MX')}</b>`,
        { parse_mode: 'HTML' }
    );
});

setInterval(() => {
    const users = getUsers();
    const ahora = Date.now();
    let cambios = false;

    for (const userId in users) {
        const user = users[userId];
        if (user.purchases && Array.isArray(user.purchases)) {
            user.purchases.forEach(p => {
                const restante = p.expirationDate - ahora;
                if (restante > 0 && restante <= 2 * 24 * 60 * 60 * 1000 && !p.notified) {
                    p.notified = true;
                    cambios = true;
                    bot.telegram.sendMessage(
                        userId,
                        `⚠️ <b>¡Aviso de Vencimiento Próximo!</b>\nTu servicio de <b>${p.productName}</b> expira en menos de 2 días.`,
                        {
                            parse_mode: 'HTML',
                            ...Markup.inlineKeyboard([[Markup.button.callback('🔄 Renovar Ahora', 'renovar_directo')]])
                        }
                    ).catch(() => {});
                }
            });
        }
    }
    if (cambios) saveUsers(users);
}, 60 * 60 * 1000);

bot.action('renovar_directo', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    clientState[ctx.from.id] = { step: 'waiting_renewal_email' };
    ctx.reply('🔄 Ingresa el <b>correo electrónico</b> para renovar:', { parse_mode: 'HTML' });
});

bot.launch();
bot.telegram.setMyCommands([]).catch(() => {});
console.log('🤖 Bot listo y operando correctamente...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));