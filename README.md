#### 快速将JSX中styleName形式的样式写法转换为className

## usage

### 安装

yarn add @mf/style2class

### 配置

#### options

| option          | Description                                              | type                           |
| --------------- | -------------------------------------------------------- | ------------------------------ |
| jsxPropertyName | 需要转换为className的jsx属性                             | "style" , "styleName"(default) |
| entry           | 入口文件 详见：<https://www.npmjs.com/package/fast-glob> | 入口文件                       |
| computed        | 是否以style['XXX']                                       | boolean                        |
| computedEntry   | 将 style['XXX'] 转换为 style.XXX 的入口文件;             | 入口文件                       |
| styleObjectName | style 对象的名称                                         | string OR (filepath)=>string   |
| cssProcessors   | 支持的预编译语言   'css' ， 'less' ， 'scss' ， 'sass'   | string[]                       |
| prettierConfig  | prettier 配置文件路径，用于格式化代码                    | string                         |

#### 在package.json或者.style2classrc.js中添加配置

```js
// package.json 
{
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

#### 执行

```js
"scripts":{
    ...
    "sty2cls": "style2class run",
    "remove": "style2class remove"
}
```

yarn sty2cls

### 效果

```js

//------origin code
<div styleName="content"></div>
<div styleName="content col"></div>
<div styleName="content col-1"></div>
<div styleName={true ? 'content1' : 'content2'}></div>
<div styleName={true && 'content'}></div>
<div styleName={`content ${true && 'colo'}`}></div>
<div styleName={classNames('content', { col: true })}></div>

//------target code
<div className={style.content}></div>
<div className={`${style.content} ${style.col}`}></div>
<div className={`${style.content} ${style['col-1']}`}></div>
<div className={true ? style.content1 : style.content2}></div>
<div className={true && style.content}></div>
<div className={`${style.content} ${true && style.colo}`}></div>
<div styleName={classNames('content', { col: true })}></div>
```
