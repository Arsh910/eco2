import React, { useContext } from "react";

const ThemeContext = React.createContext({
    thememode: 'light',
    changeMode: ()=>{}
})

export const Themeprovider = ThemeContext.Provider

export default function useTheme(){
    return useContext(ThemeContext);   
}

