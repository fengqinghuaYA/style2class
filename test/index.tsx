import style from './style.module.less';
import React, { memo } from 'react';
import cls from 'classnames';

let AverageScoreChart = (_props: IProps) => {
    //变量声明、解构

    //逻辑处理函数

    //组件Effect
    const classNames = 'blue ss';

    const getStyle = () => {};

    return (
        <div>
            <div styleName={`dddd-${true && 'active'}`}></div>
            <div className={true && style.active}></div>
            <div className={true ? cls(style.content, `${true && cls(style.content)}`) : ''}></div>
            <div className={style.content}> </div>
            <div className={`${style.content} ${style.blue}`}> </div>
            <div styleName={classNames}></div>
            <div
                className={cls(
                    `${style.content} ${style['content-1']}`,
                    true && `${style.content} ${style['content-2']}`,
                    {
                        [style.disabled]: true,
                        [style['blue-1']]: true,
                    },
                    [style.white, false && style.red, true ? style.white : style.red]
                )}
            ></div>
            <div className={cls(style.aa)}></div>
            <div className="anana"></div>
        </div>
    );
};

//props类型定义
interface IProps {}

//prop-type定义，可选
