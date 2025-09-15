import React from "react";
import { Routes, Route, Link, useParams } from "react-router-dom";

function Notfound(){
    return (
        </>
            <h1>404</h1>
            <div>페이지를 찾을 수 없습니다...</div>
        </>
    );
}

function Home() {
    return (
        </>
            <h1>대문</h1>
        </>
    );
}

function Doc() {
    const { id } = useParams();
    return (
        </>
            <h1>{id}</h1>
        </>
    );
}

export default function App() {
    return (
        <div>
            <Routes>
                <Route path="*" element={<Notfound />} />
                <Route path="/" element={<Home />} />
                <Route path="/doc/:id" element={<Doc />} />
            </Routes>
        </div>
    );
}