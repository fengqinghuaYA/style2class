#### 快速将JSX中styleName形式的样式写法转换为className

### usage

## 安装 
yarn add @mf/style2class 

## 配置
package.json

{

    "scripts":{
        ...
        "run": "style2class run"
    }
    ...
    "style2class":[
        "client/components/common/**/*.tsx" // 配置规则参见 https://github.com/mrmlnc/fast-glob
    ]
}

## 执行 
yarn run 