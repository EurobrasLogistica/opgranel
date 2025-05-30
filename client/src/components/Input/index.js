import React from "react";
import style from "./Input.module.css"


const Input = ({ type, text, name, placeholder, onChange, onKeyPress, disabled }) => {
    return (
        <div className={style.form_control}>
            <label htmlFor={name}>{text}:</label>
            <input type={type}
                name={name}
                id={name}
                placeholder={placeholder}
                onChange={onChange}
                onKeyPress={onKeyPress}
                disabled={disabled}
            />
        </div>
    )
}


export default Input;