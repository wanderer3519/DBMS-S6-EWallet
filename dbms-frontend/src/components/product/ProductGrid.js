import React from 'react';
import './ProductGrid.css'; // Import your CSS file for styling

const ProductGrid = ({ products }) => {
  return (
    <div className="container py-4">
      
      <div className="row g-4">
        {products && products.length > 0 ? (
          products.map((product) => (
            <div key={product.product_id} className="col-12 col-sm-6 col-md-4 col-lg-3">
              <div className="card h-100 shadow-sm product-card">
                <div className="card-img-container">
                  <img
                    src={product.image_url || 'default-product.png'}
                    className="card-img-top"
                    alt={product.name}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                </div>
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{product.name}</h5>
                  <p className="card-text text-success fw-bold">${product.price?.toFixed(2)}</p>
                  <div className="card-text description-container">
                    <p className="small text-muted">{product.description}</p>
                  </div>
                  <div className="mt-auto pt-2">
                    <button className="btn btn-primary w-100">View Details</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-12">
            <p className="text-center">No products available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGrid;