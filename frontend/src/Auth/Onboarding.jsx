import React, { useState } from 'react'
import HotelProfileForm from './Profile';
import SetUp from './SetUp';
import CreateWebsite from './CreateWebsite';
import { ArrowLeft, ArrowRight } from 'lucide-react';
//import { Progress } from "@/components/ui/progress"


export default function Onboarding() {
    const [active, setActive] = useState(1)


    const renderComponent  = ()=>{
        switch (active) {
            case 1:
                return <HotelProfileForm setActive={setActive} />;
            case 2:
                return <SetUp/>;
            default:
                return <div></div>;
        }
    }

    const next =()=>{
        if(active < 2){
            setActive(active + 1)
        }
    }
    const prev =()=>{
        if(active > 1){
            setActive(active - 1)
        }
    }
    //<Progress value={33} className='float-right'/>
  return (
    <div className='w-full max-w-5xl mx-auto '>
        <h1 className='py-5 text-2xl font-bold text-center'>Onboarding</h1>
        <div className='w-full flex items-center justify-between '>
            <button className='rounded-lg ' id='trans-bg'>
        <ArrowLeft onClick={prev} />
            </button>
            <button className='rounded-lg ' id='trans-bg'>
        <ArrowRight onClick={next} />
            </button>
        </div>
      <div>
        {renderComponent()}
      </div>
    </div>
  )
}
