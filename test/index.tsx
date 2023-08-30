import style from "./style.module.less";
import React, { memo } from "react";

let AverageScoreChart = (_props: IProps) => {
  //变量声明、解构

  //逻辑处理函数

  //组件Effect

  return (
    <div
      styleName={classNames(style["container"], {
        [style["changed"]]: changed,
      })}
    >
      {text}
    </div>
  );
};

//props类型定义
interface IProps {}

//prop-type定义，可选

AverageScoreChart = observer(AverageScoreChart);
export { AverageScoreChart };
