import Logo from "./sticker.png"

export default function Header(){
    return(
        <div className="flex flex-col justify-center text-white gap-2 text-center text-2xl items-center w-fit self-center h-fit">
            <img src={Logo} className="h-32 drop-shadow-2xl" alt="logo"/>
            <h1>КРОТ</h1>
            <h2>комплексное расследование обстоятельств травмы</h2>
        </div>
    )
}