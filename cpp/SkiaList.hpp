#pragma once

#include "HybridSkiaListSpec.hpp"

class SkiaList: public margelo::nitro::skialist::HybridSkiaListSpec {
public:
  SkiaList(): HybridObject(TAG) {}
public:
  double multiply(double a, double b) override;
};


