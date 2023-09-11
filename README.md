#### 快速将JSX中styleName形式的样式写法转换为className

### usage

## 安装 
yarn add @mf/style2class 

## 配置
/ package.json
{

    "scripts":{
        ...
        "run": "style2class run",
        "remove": "style2class remove"
    }
    ...
    "style2class":{
        entry:["client/components/common/**/*.tsx" //  styleName 转 className；配置规则参见 https://github.com/mrmlnc/fast-glob]
        computedEntry:["client/components/common/**/*.tsx" // 配置规则参见 https://github.com/mrmlnc/fast-glob],
        computed:true // 是否以style['XXX'] 取值
    }
}

## 执行 
yarn run 