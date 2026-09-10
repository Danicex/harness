import React from 'react'
import { Link } from 'react-router-dom'


export default function Support() {
  return (
    <div className="support-page p-8 max-w-screen-lg max-lg:w-3/4 max-sm:w-4/5 m-auto">
      <Link to={'/'}> <button className='p-5 mb-3 rounded-full'>←</button></Link>
    <h1 className="text-4xl font-bold mb-4">Support</h1>
    <p className="text-lg mb-6">
      If you need assistance, you’re in the right place. Our support team is here to help with any questions or issues.
    </p>

    <div className="support-content space-y-8">
      {/* Placeholder for an FAQ Section */}
      <div className="faq-section">
        <h2 className="text-2xl font-semibold mb-4">FAQs</h2>
        <ul className="list-disc ml-6 space-y-2 text-lg">
          <li><span className='bold-txt'>Question 1:</span>  How do I create a website? - Answer: You can navigate to the admin dashboard, click on the website tab on the navigation bar and follow the preceding steps.</li>
          <li><span className='bold-txt'>Question 2:</span> How do I create a staff, inventory, or a rooms - Answer: navigate to the admin dashboard, click on the (staff, inventory, room) tab on the navigation bar and follow the preceding steps.
            by clicking on the create button you can now input into the feilds, then click save
          </li>
          <li><span className='bold-txt'>Update (staff, inventory, room)</span> You can also delete or update the (staff, inventory, room) by clicking on the actions button which opens a tab that  lets you update the values. </li>
          <li><span className='bold-txt'>Delete (staff, inventory, room)</span> To delete you simply hit the delete button on the opened action tab </li>
        </ul>
      </div>

      {/* Placeholder for a Support Video */}
      <div className="support-video-placeholder bg-gray-300 h-64 flex items-center justify-center rounded-md">
        <p className="text-center text-gray-700">Support Video Placeholder</p>
      </div>

      {/* Placeholder for a Contact Form or Image */}
      <div className="support-image-placeholder bg-gray-300 h-48 flex items-center justify-center rounded-md">
        <p className="text-center text-gray-700">Contact Form / Image Placeholder</p>
      </div>
    </div>
  </div>

  )
}
