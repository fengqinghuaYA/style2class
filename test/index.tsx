import "./style.module.less";
import React, { memo } from "react";

//私有常量

//可抽离的逻辑处理函数/组件

let PersonalArchivesTitle = (_props: IProps) => {
  //变量声明、解构

  //组件状态
  const state = "aaa";

  //网络IO

  //数据转换

  //逻辑处理函数

  //组件Effect

  return <div styleName="content active"></div>;
};

const style = "outer";

const styles = "styles";

//props类型定义
interface IProps {}

//prop-type定义，可选

PersonalArchivesTitle = memo(PersonalArchivesTitle);
export { PersonalArchivesTitle };

<div styleName="content"></div>;
<div styleName="content active"></div>;
<div styleName={classNames("content", { active: true })}></div>;
<div styleName={`content ${true ? "active" : ""}`}></div>;
