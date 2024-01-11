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
            <div styleName={true && 'active'}></div>
            <div styleName={true ? cls('content', `${true && cls('content')}`) : ''}></div>
            <div styleName="content"> </div>
            <div styleName="content blue"> </div>
            <div styleName={classNames}></div>
            <div
                styleName={cls(
                    'content content-1',
                    true && 'content content-2',
                    {
                        disabled: true,
                        ['blue-1']: true,
                    },
                    ['white', false && 'red', true ? 'white' : 'red']
                )}
            ></div>

            <div styleName={cls('aa')}></div>

            <div className="anana"></div>
        </div>
    );
};

//props类型定义
interface IProps {}

//prop-type定义，可选
