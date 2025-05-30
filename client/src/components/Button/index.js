import React from "react";
import style from "./SubmitButton.module.css"


const SubmitButton = ({ text, type, onClick, onKeyPress, disabled}) => {
    return(
        <div className={style.form_control}>
            <button type={type}className={style.btn} onKeyPress={onKeyPress}onClick={onClick} disabled={disabled} >{text}</button>     
            
        </div>
    )
}


export default SubmitButton;