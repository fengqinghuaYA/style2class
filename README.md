#### 快速将JSX中styleName形式的样式写法转换为className

### usage

## 安装 
yarn add @mf/style2class 

## 配置
```js
/**
 * @param {string[]} entry- 入口文件 详见：https://www.npmjs.com/package/fast-glob
 * @param {boolean} computed - 是否以style['XXX']
 * @param {string[]} computedEntry- 将 style['XXX'] 转换为 style.XXX 的入口文件;
 * @param {string | (filePath:string)=>string} styleObjectName- style 对象的名称
 * @param {string[]} cssProcessors- 支持的预编译语言 'css' | 'less' | 'scss' | 'sass'
 * @param {string} prettierConfig- prettier 配置文件路径，用于格式化代码
 */

// package.json 
{

    "scripts":{
        ...
        "run": "style2class run",
        "remove": "style2class remove"
    }
    ...
    "style2class":{
       "entry": []
       ....
    }
}

//.style2classrc.js
module.exports = {
    entry: [],
    styleObjectName(filePath) {
        return filePath.slice(-5)
    }
    ...
}
```

## 执行 
yarn run 