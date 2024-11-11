const express = require('express'); 
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors()); // 允许所有来源的请求
app.use(bodyParser.json());
app.use(express.static('public'));

const productsFilePath = path.join(__dirname, 'products.json');
const remarksFilePath = path.join(__dirname, 'remarks.js');
const statusFilePath = path.join(__dirname, 'status.json');



// 更新备注
app.put('/remarks', (req, res) => {
    const { remarks } = req.body;

    // 将备注内容写入 remarks.js，允许 HTML 格式
    const dataToWrite = `module.exports = ${JSON.stringify({ remarks })};`;

    fs.writeFile(remarksFilePath, dataToWrite, (err) => {
        if (err) {
            console.error('写入失败:', err);
            return res.status(500).send('写入错误');
        }
        console.log('备注已更新:', remarks);
        res.status(200).send('更新成功');
    });
});

// 读取商品列表
const readProducts = () => {
    const data = fs.readFileSync(productsFilePath);
    return JSON.parse(data);
};

// 写入商品列表
const writeProducts = (products) => {
    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
};

// 获取商品列表
app.get('/products', (req, res) => {
    const products = readProducts();
    products.sort((a, b) => a.order - b.order);
    res.json(products);
});

// 获取备注
app.get('/remarks', (req, res) => {
    // 动态读取 remarks.js
    delete require.cache[require.resolve(remarksFilePath)]; // 清除缓存
    const remarksData = require(remarksFilePath);
    res.json(remarksData);
});

// 增加商品
app.post('/products', (req, res) => {
    const { name, price, stock } = req.body;
    const products = readProducts();
    const id = products.length ? products[products.length - 1].id + 1 : 1;
    const newProduct = { id, name, price: parseFloat(price), stock: parseInt(stock), order: id, hidden: false, color: '#ffffff', opacity: 1, brightness: 100 };
    products.push(newProduct);
    writeProducts(products);
    res.json({ message: '商品添加成功' });
});

// 修改商品价格
app.put('/products/:id/price', (req, res) => {
    const id = parseInt(req.params.id);
    const { price } = req.body;
    const products = readProducts();
    const product = products.find(p => p.id === id);
    if (product) {
        product.price = parseFloat(price);
        writeProducts(products);
        res.json({ message: '价格已更新' });
    } else {
        res.status(404).json({ message: '商品未找到' });
    }
});

// 修改商品库存
app.put('/products/:id/stock', (req, res) => {
    const id = parseInt(req.params.id);
    const { stock } = req.body;
    const products = readProducts();
    const product = products.find(p => p.id === id);
    if (product) {
        product.stock = parseInt(stock);
        writeProducts(products);
        res.json({ message: '库存已更新' });
    } else {
        res.status(404).json({ message: '商品未找到' });
    }
});

// 修改商品顺序
app.put('/products/:id/order', (req, res) => {
    const id = parseInt(req.params.id);
    const { order } = req.body;
    const products = readProducts();
    const product = products.find(p => p.id === id);
    if (product) {
        const existingProduct = products.find(p => p.order === order);
        if (existingProduct) {
            existingProduct.order = product.order;  // 交换顺序
        }
        product.order = order;
        writeProducts(products);
        res.json({ message: '顺序已更新' });
    } else {
        res.status(404).json({ message: '商品未找到' });
    }
});

// 删除商品
app.delete('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const products = readProducts();
    const productIndex = products.findIndex(p => p.id === id);
    if (productIndex !== -1) {
        products.splice(productIndex, 1);
        writeProducts(products);
        res.json({ message: '商品已删除' });
    } else {
        res.status(404).json({ message: '商品未找到' });
    }
});

// 隐藏或显示商品
app.put('/products/:id/visibility', (req, res) => {
    const id = parseInt(req.params.id);
    const { hidden } = req.body;
    const products = readProducts();
    const product = products.find(p => p.id === id);
    if (product) {
        product.hidden = hidden; // 更新商品的隐藏状态
        writeProducts(products);
        res.json({ message: '商品状态已更新' });
    } else {
        res.status(404).json({ message: '商品未找到' });
    }
});

// 修改商品颜色、透明度和明暗
app.put('/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { color, opacity, brightness } = req.body;
    const products = readProducts();
    const product = products.find(p => p.id === id);
    if (product) {
        product.color = color;         // 更新颜色
        product.opacity = opacity;     // 更新透明度
        product.brightness = brightness; // 更新明暗
        writeProducts(products);
        res.json({ message: '颜色和属性已更新' });
    } else {
        res.status(404).json({ message: '商品未找到' });
    }
});


// 读取状态文件，初始化状态
let currentStatus = 'open'; // 默认状态
if (fs.existsSync(statusFilePath)) {
    const data = fs.readFileSync(statusFilePath);
    currentStatus = JSON.parse(data).status || 'open';
}

// 处理获取当前状态的请求
app.get('/status', (req, res) => {
    const statusData = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
    res.json({ status: statusData.status, reason: statusData.reason });
});

// 处理设置状态的请求
app.post('/status', (req, res) => {
    const { status, reason } = req.body;

    if (status === 'open' || status === 'closed') {
        currentStatus = status;

        // 保存状态和未营业原因
        const statusData = { status: currentStatus, reason: status === 'closed' ? reason : null };
        fs.writeFileSync(statusFilePath, JSON.stringify(statusData));

        res.status(200).send('状态更新成功');
    } else {
        res.status(400).send('无效的状态');
    }
});


// 启动服务器
const PORT = 3000; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
