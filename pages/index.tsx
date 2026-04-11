import {Box} from '@mui/material'
import type {NextPage} from 'next'
import Experience from '../src/components/Sections/TechTools/TechTools'
import Hero from '../src/components/Sections/Hero/Hero'
import Perks from '../src/components/Sections/Perks/Perks'
import Projects from '../src/components/Sections/Projects/Projects';
import CTA from '../src/components/Sections/CallToAction/CTA'
import {useEffect, useRef} from 'react';
import CursorAnimation from '../src/gsap/CursorAnimation';
import About from '../src/components/Sections/About/About';
import Layout from '../Layout/Layout'

const myIconsArray = [
    { title: 'C / C++', svg: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg', isBackend: false, filter: false },
    { title: 'Python', svg: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg', isBackend: false, filter: false },
    { title: 'JavaScript', svg: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg', isBackend: false, filter: false },
    { title: 'MATLAB', svg: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/matlab/matlab-original.svg', isBackend: false, filter: false },
    
    { title: 'Arduino', svg: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/arduino/arduino-original.svg', isBackend: true, filter: false },
    { title: 'ESP32 / STM32', svg: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/embeddedc/embeddedc-original.svg', isBackend: true, filter: false },
    { title: 'Intel 8086', svg: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cpu/cpu-original.svg', isBackend: true, filter: true },
    { title: 'Cloudflare', svg: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cloudflare/cloudflare-original.svg', isBackend: true, filter: false }
];

const myProjectsArray = [
    {
        title: "Máy Tính Bỏ Túi Arduino",
        description: "Đồ án 2: Thiết kế máy tính điện tử sử dụng Arduino Uno R3 và Keypad 4x4, xử lý logic bằng thuật toán RPN.",
        siteUrl: "https://phanduc.eu.org",
        repoUrl: "https://github.com/phanducc",
        img: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?q=80&w=1000&auto=format&fit=crop" 
    },
    {
        title: "Freefilm Streaming",
        description: "Dự án nền tảng xem phim trực tuyến",
        siteUrl: "https://freefilm.pp.ua",
        repoUrl: "https://github.com/phanducc/freefilm",
        img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop"
    }
];

const Home : NextPage = () => {
    const ball = useRef()

    useEffect(() => {
        if (ball && ball.current) {
            CursorAnimation(ball.current)
        }
    }, [])

    return (
        <Layout desc={`Portfolio của Phan Văn Đức - Chuyên ngành Kỹ thuật Điện tử Viễn thông`} title='Phan Đức | Portfolio'>
            <Box sx={{ margin: '0 auto', color: 'white' }}>
                <Hero/>
                <Perks/>
                
                <Experience iconsArray={myIconsArray}/>
                <Projects projectsArray={myProjectsArray}/>
                
                <About/>
                <CTA/>

                <Box ref={ball} sx={{ display: { xs: 'none', md: 'block' } }} className="ball"></Box>
            </Box>
        </Layout>
    )
}

export default Home;